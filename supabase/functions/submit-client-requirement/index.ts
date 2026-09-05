import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InputType = "text" | "voice" | "url";

interface SubmitRequirementBody {
  requirement_id?: string;
  client_name?: string;
  input_type?: InputType;
  raw_input?: string;
  source_url?: string | null;
  audio_file_url?: string | null;
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
          message: "Use POST to submit a client requirement.",
        },
      },
      405,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "SERVER_CONFIG_ERROR",
          message: "Supabase function environment is missing required configuration.",
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
          message: "You must be signed in to submit a requirement.",
        },
      },
      401,
    );
  }

  let body: SubmitRequirementBody;

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

  const clientName = body.client_name?.trim();
  const inputType = body.input_type ?? "text";
  const rawInput = body.raw_input?.trim();
  const sourceUrl = body.source_url?.trim() || null;
  const audioFileUrl = body.audio_file_url?.trim() || null;

  if (!clientName) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "CLIENT_NAME_REQUIRED",
          message: "Client name is required.",
        },
      },
      400,
    );
  }

  if (!["text", "voice", "url"].includes(inputType)) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "INVALID_INPUT_TYPE",
          message: "Input type must be text, voice, or url.",
        },
      },
      400,
    );
  }

  if (!rawInput && !sourceUrl && !audioFileUrl) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "REQUIREMENT_REQUIRED",
          message: "Add a requirement, URL, or voice upload before continuing.",
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

  const requirementId = body.requirement_id?.trim();
  const payload = {
    client_name: clientName,
    input_type: inputType,
    raw_input: rawInput || null,
    source_url: sourceUrl,
    audio_file_url: audioFileUrl,
    transcribed_text: null,
    refined_requirements_json: null,
    requirements_json: null,
    error_message: null,
    status: "draft",
  };

  const query = requirementId
    ? supabase
      .from("client_requirements")
      .update(payload)
      .eq("id", requirementId)
      .eq("user_id", user.id)
    : supabase
      .from("client_requirements")
      .insert({ ...payload, user_id: user.id });

  const { data, error } = await query
    .select("id,status")
    .single();

  if (error) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: requirementId ? "UPDATE_FAILED" : "INSERT_FAILED",
          message: requirementId ? "Could not update the client requirement." : "Could not save the client requirement.",
          details: error.message,
        },
      },
      500,
    );
  }

  return jsonResponse({
    success: true,
    requirement_id: data.id,
    status: data.status,
  });
});
