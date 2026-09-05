import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TranscribeRequirementBody {
  requirement_id?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Use POST to transcribe a voice requirement.",
        },
      },
      405,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey || !openAiKey) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "SERVER_CONFIG_ERROR",
          message: "Transcription environment is missing required configuration.",
        },
      },
      500,
    );
  }

  if (!authorization) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You must be signed in to transcribe a requirement.",
        },
      },
      401,
    );
  }

  let body: TranscribeRequirementBody;

  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      },
      400,
    );
  }

  const requirementId = body.requirement_id?.trim();

  if (!requirementId) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "REQUIREMENT_ID_REQUIRED",
          message: "Requirement ID is required.",
        },
      },
      400,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Your session could not be verified. Please sign in again.",
        },
      },
      401,
    );
  }

  const { data: requirement, error: requirementError } = await supabase
    .from("client_requirements")
    .select("id,audio_file_url")
    .eq("id", requirementId)
    .eq("input_type", "voice")
    .single();

  if (requirementError || !requirement) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "REQUIREMENT_NOT_FOUND",
          message: "Could not load this voice requirement.",
        },
      },
      404,
    );
  }

  if (!requirement.audio_file_url) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "AUDIO_MISSING",
          message: "This requirement does not have an audio file.",
        },
      },
      400,
    );
  }

  const { data: audioBlob, error: downloadError } = await supabase.storage
    .from("requirement-audio")
    .download(requirement.audio_file_url);

  if (downloadError || !audioBlob) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "AUDIO_DOWNLOAD_FAILED",
          message: "Could not read the uploaded audio.",
          details: downloadError?.message,
        },
      },
      500,
    );
  }

  const formData = new FormData();
  formData.append("model", "whisper-1");
  formData.append("language", "en");
  formData.append("response_format", "json");
  formData.append("file", audioBlob, "requirement.webm");

  const transcriptResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
    },
    body: formData,
  });

  if (!transcriptResponse.ok) {
    const details = await transcriptResponse.text();
    console.error(`OPENAI_TRANSCRIPTION_FAILED:${transcriptResponse.status}:${details.slice(0, 500)}`);
    return jsonResponse(
      {
        success: false,
        error: {
          code: "TRANSCRIPTION_FAILED",
          message: "OpenAI could not transcribe this recording.",
          details,
        },
      },
      502,
    );
  }

  const transcript = await transcriptResponse.json();
  const text = typeof transcript.text === "string" ? transcript.text.trim() : "";

  if (!text) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "EMPTY_TRANSCRIPT",
          message: "The recording did not produce any transcript.",
        },
      },
      422,
    );
  }

  const { error: updateError } = await supabase
    .from("client_requirements")
    .update({
      transcribed_text: text,
      raw_input: text,
      status: "draft",
    })
    .eq("id", requirement.id);

  if (updateError) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: "Could not save the transcript.",
          details: updateError.message,
        },
      },
      500,
    );
  }

  return jsonResponse({
    success: true,
    requirement_id: requirement.id,
    transcribed_text: text,
  });
});
