import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ParseRequirementBody {
  requirement_id?: string;
}

interface RefinedRequirement {
  location: string | null;
  budget: number | null;
  budget_label: string | null;
  currency: string | null;
  property_type: string | null;
  property_category: "residential" | "commercial" | "land";
  bedrooms: number | null;
  bathrooms: number | null;
  purpose: "buy" | "rent" | "unknown";
  sqft_min: number | null;
  sqft_max: number | null;
  must_haves: string[];
  deal_breakers: string[];
  assumptions: string[];
  missing_fields: string[];
  confidence: number;
  summary: string;
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

function extractJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found.");
    return JSON.parse(match[0]);
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function normalizeRefinedRequirement(value: Record<string, unknown>, fallbackText: string): RefinedRequirement {
  const category = value.property_category === "commercial" || value.property_category === "land"
    ? value.property_category
    : "residential";
  const purpose = value.purpose === "buy" || value.purpose === "rent" ? value.purpose : "unknown";
  const confidence = asNullableNumber(value.confidence);

  return {
    location: asNullableString(value.location),
    budget: asNullableNumber(value.budget),
    budget_label: asNullableString(value.budget_label),
    currency: asNullableString(value.currency),
    property_type: asNullableString(value.property_type),
    property_category: category,
    bedrooms: asNullableNumber(value.bedrooms),
    bathrooms: asNullableNumber(value.bathrooms),
    purpose,
    sqft_min: asNullableNumber(value.sqft_min),
    sqft_max: asNullableNumber(value.sqft_max),
    must_haves: asStringArray(value.must_haves),
    deal_breakers: asStringArray(value.deal_breakers),
    assumptions: asStringArray(value.assumptions),
    missing_fields: asStringArray(value.missing_fields),
    confidence: confidence === null ? 0.55 : Math.max(0, Math.min(1, confidence)),
    summary: asNullableString(value.summary) || fallbackText,
  };
}

function fallbackRequirement(rawInput: string): RefinedRequirement {
  return {
    location: null,
    budget: null,
    budget_label: null,
    currency: null,
    property_type: null,
    property_category: "residential",
    bedrooms: null,
    bathrooms: null,
    purpose: "unknown",
    sqft_min: null,
    sqft_max: null,
    must_haves: [],
    deal_breakers: [],
    assumptions: ["Could not fully structure the brief automatically."],
    missing_fields: ["budget", "location", "property type"],
    confidence: 0.25,
    summary: rawInput,
  };
}

async function parseWithOpenAI(rawInput: string, clientName: string | null): Promise<RefinedRequirement> {
  const openAiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openAiKey) {
    return fallbackRequirement(rawInput);
  }

  const prompt = [
    "You are the PropShorts requirement parsing agent for a real estate broker.",
    "Extract a concise structured property requirement from the broker's note.",
    "Support incomplete broker notes. Use reasonable high-level assumptions only when safe.",
    "Never invent specific budget, sqft, bedrooms, URLs, or facts not present.",
    "Return JSON only with this exact shape:",
    "{",
    '  "location": "string|null",',
    '  "budget": "number|null",',
    '  "budget_label": "string|null",',
    '  "currency": "string|null",',
    '  "property_type": "string|null",',
    '  "property_category": "residential|commercial|land",',
    '  "bedrooms": "number|null",',
    '  "bathrooms": "number|null",',
    '  "purpose": "buy|rent|unknown",',
    '  "sqft_min": "number|null",',
    '  "sqft_max": "number|null",',
    '  "must_haves": ["string"],',
    '  "deal_breakers": ["string"],',
    '  "assumptions": ["string"],',
    '  "missing_fields": ["string"],',
    '  "confidence": 0.0,',
    '  "summary": "short broker-readable sentence"',
    "}",
    "",
    `Client name: ${clientName || "Unknown"}`,
    `Broker note: ${rawInput}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    return fallbackRequirement(rawInput);
  }

  const data = await response.json();
  const outputText = data.output_text ||
    data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
      ?.map((content: { text?: string }) => content.text ?? "")
      ?.join("\n") ||
    "";

  const parsed = extractJsonObject(outputText) as Record<string, unknown>;
  return normalizeRefinedRequirement(parsed, rawInput);
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
          message: "Use POST to parse a client requirement.",
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
          message: "You must be signed in to parse a requirement.",
        },
      },
      401,
    );
  }

  let body: ParseRequirementBody;

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
    .select("id,client_name,raw_input,transcribed_text,source_url")
    .eq("id", requirementId)
    .single();

  if (requirementError || !requirement) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "REQUIREMENT_NOT_FOUND",
          message: "Could not load this requirement.",
        },
      },
      404,
    );
  }

  const parseInput = requirement.transcribed_text || requirement.raw_input || requirement.source_url || "";

  if (!parseInput.trim()) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "EMPTY_REQUIREMENT",
          message: "There is no requirement text to parse.",
        },
      },
      400,
    );
  }

  const refinedRequirement = await parseWithOpenAI(parseInput, requirement.client_name);

  const { error: updateError } = await supabase
    .from("client_requirements")
    .update({
      requirements_json: refinedRequirement,
      refined_requirements_json: refinedRequirement,
      status: "completed",
    })
    .eq("id", requirement.id);

  if (updateError) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: "UPDATE_FAILED",
          message: "Could not save the refined requirement.",
          details: updateError.message,
        },
      },
      500,
    );
  }

  return jsonResponse({
    success: true,
    requirement_id: requirement.id,
    refined_requirement: refinedRequirement,
  });
});
