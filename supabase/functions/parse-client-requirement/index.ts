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

function titleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parseBudgetFromText(rawInput: string): Pick<RefinedRequirement, "budget" | "budget_label" | "currency"> {
  const text = rawInput.toLowerCase();
  const match =
    text.match(/\b(?:under|below|upto|up to|around|approx(?:imately)?|budget(?:\s+of)?|within|max(?:imum)?)\s*(?:rs\.?|inr|₹)?\s*([0-9]+(?:\.[0-9]+)?)\s*(k|thousand|lakh|lac|l|cr|crore)?\b/i) ||
    text.match(/\b(?:rs\.?|inr|₹)\s*([0-9]+(?:\.[0-9]+)?)\s*(k|thousand|lakh|lac|l|cr|crore)?\b/i) ||
    text.match(/\b([0-9]+(?:\.[0-9]+)?)\s*(k|thousand|lakh|lac|l|cr|crore)\b/i);

  if (!match) return { budget: null, budget_label: null, currency: null };

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return { budget: null, budget_label: null, currency: null };

  const unit = match[2]?.toLowerCase();
  const multiplier = unit === "cr" || unit === "crore"
    ? 10_000_000
    : unit === "lakh" || unit === "lac" || unit === "l"
      ? 100_000
      : unit === "k" || unit === "thousand"
        ? 1_000
        : 1;
  const budget = Math.round(amount * multiplier);
  const budgetLabel = `INR ${match[1]}${unit ? ` ${unit}` : ""}${/rent|lease|month|monthly|pg|stay/.test(text) ? "/month" : ""}`;

  return {
    budget,
    budget_label: budgetLabel,
    currency: "INR",
  };
}

function parseLocationFromText(rawInput: string): string | null {
  const text = rawInput.replace(/[.,;]+/g, " ");
  const knownPlaces = [
    "greater noida",
    "new delhi",
    "delhi ncr",
    "gurgaon",
    "gurugram",
    "noida",
    "delhi",
    "bengaluru",
    "bangalore",
    "mumbai",
    "pune",
    "hyderabad",
    "chennai",
    "kolkata",
    "jaipur",
    "ahmedabad",
    "ahemdabad",
    "lucknow",
    "indore",
    "faridabad",
    "ghaziabad",
  ];
  const lower = text.toLowerCase();
  const matches = knownPlaces.filter((place) => new RegExp(`\\b${place.replace(/\s+/g, "\\s+")}\\b`, "i").test(lower));

  if (matches.length) {
    const unique = Array.from(new Set(matches.map(titleCase)));
    return unique.slice(0, 2).join(" / ");
  }

  const phraseMatch = text.match(/\b(?:in|near|around|at)\s+([a-z][a-z\s-]{2,40})(?:\s+(?:under|below|upto|up to|for|with|and|or|rent|buy|sale|flat|apartment|villa|pg|plot)\b|$)/i);
  return phraseMatch?.[1] ? titleCase(phraseMatch[1]) : null;
}

function ruleBasedRequirement(rawInput: string): RefinedRequirement {
  const text = rawInput.toLowerCase();
  const bedroomsMatch = text.match(/\b([1-9])\s*(?:bhk|bed|beds|bedroom|bedrooms)\b/i);
  const bathroomsMatch = text.match(/\b([1-9])\s*(?:bath|baths|bathroom|bathrooms)\b/i);
  const sqftMatch = text.match(/\b([0-9]{3,5})\s*(?:sq\.?\s*ft|sqft|square\s+feet)\b/i);
  const budget = parseBudgetFromText(rawInput);
  const location = parseLocationFromText(rawInput);

  const propertyType = /\bpg\b|paying guest|shared living|co-?living/.test(text)
    ? "PG stay"
    : /apartment/.test(text)
      ? "Apartment"
      : /\bflat\b/.test(text)
        ? "Flat"
        : /\bvilla\b/.test(text)
          ? "Villa"
          : /\bplot|land\b/.test(text)
            ? "Land"
            : /\boffice|shop|commercial\b/.test(text)
              ? "Commercial space"
              : null;

  const propertyCategory: RefinedRequirement["property_category"] = /\bplot|land\b/.test(text)
    ? "land"
    : /\boffice|shop|commercial\b/.test(text)
      ? "commercial"
      : "residential";

  const purpose: RefinedRequirement["purpose"] = /\brent|lease|month|monthly|pg|stay\b/.test(text)
    ? "rent"
    : /\bbuy|purchase|sale|sell\b/.test(text)
      ? "buy"
      : "unknown";

  const bedrooms = bedroomsMatch ? Number(bedroomsMatch[1]) : null;
  const bathrooms = bathroomsMatch ? Number(bathroomsMatch[1]) : null;
  const sqft = sqftMatch ? Number(sqftMatch[1]) : null;
  const summaryParts = [
    bedrooms ? `${bedrooms} BHK` : null,
    propertyType?.toLowerCase() ?? "property",
    location ? `in ${location}` : null,
    budget.budget_label ? `with budget ${budget.budget_label}` : null,
  ].filter(Boolean);

  return {
    location,
    budget: budget.budget,
    budget_label: budget.budget_label,
    currency: budget.currency,
    property_type: propertyType,
    property_category: propertyCategory,
    bedrooms,
    bathrooms,
    purpose,
    sqft_min: sqft,
    sqft_max: sqft,
    must_haves: [],
    deal_breakers: [],
    assumptions: ["Structured from the broker brief without AI refinement."],
    missing_fields: [
      !budget.budget ? "budget" : null,
      !location ? "location" : null,
      !propertyType ? "property type" : null,
    ].filter((item): item is string => Boolean(item)),
    confidence: location || budget.budget || bedrooms || propertyType ? 0.62 : 0.25,
    summary: summaryParts.length ? `Client needs ${summaryParts.join(" ")}.` : rawInput,
  };
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
  return ruleBasedRequirement(rawInput);
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
    console.error(`OPENAI_REQUIREMENT_PARSE_FAILED:${response.status}:${(await response.text()).slice(0, 500)}`);
    return fallbackRequirement(rawInput);
  }

  const data = await response.json();
  const outputText = data.output_text ||
    data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
      ?.map((content: { text?: string }) => content.text ?? "")
      ?.join("\n") ||
    "";

  try {
    const parsed = extractJsonObject(outputText) as Record<string, unknown>;
    return normalizeRefinedRequirement(parsed, rawInput);
  } catch (error) {
    console.error(`OPENAI_REQUIREMENT_PARSE_JSON_FAILED:${error instanceof Error ? error.message : String(error)}`);
    return fallbackRequirement(rawInput);
  }
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
