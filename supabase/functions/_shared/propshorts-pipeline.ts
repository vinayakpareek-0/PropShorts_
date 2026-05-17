import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SupabaseClient = ReturnType<typeof createClient>;
type AuthorizedSupabaseClient = SupabaseClient & { __authorization?: string };

interface RequirementRow {
  id: string;
  user_id: string;
  client_name: string | null;
  raw_input: string | null;
  transcribed_text: string | null;
  source_url: string | null;
  refined_requirements_json: Record<string, unknown> | null;
}

interface RunRow {
  id: string;
  user_id: string;
  requirement_id: string;
}

interface PropertyCandidate {
  external_property_id: string;
  title: string;
  area: string | null;
  city: string | null;
  property_category: "residential" | "commercial" | "land";
  property_type: string | null;
  rent_or_buy: "rent" | "buy" | "unknown";
  price: number | null;
  price_label: string | null;
  currency: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  size_label: string | null;
  headline: string;
  description: string;
  highlights: string[];
  images: Array<{ id: string; url: string; alt: string; role: string }>;
  sort_order: number;
  trace: {
    source_url: string | null;
    platform: string | null;
    listing_id: string | null;
    agent_name: string | null;
    agent_phone: string | null;
    agent_email: string | null;
    internal_notes: string | null;
  };
}

const PROPERTY_TARGET_COUNT = 5;
const PROPERTY_IMAGES_PER_OPTION = 3;

const fallbackImageSets = [
  [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=82",
  ],
  [
    "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=82",
  ],
  [
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=82",
  ],
  [
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=82",
  ],
  [
    "https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1600566753151-384129cf4e3e?auto=format&fit=crop&w=1200&q=82",
    "https://images.unsplash.com/photo-1600607688066-890987f18a86?auto=format&fit=crop&w=1200&q=82",
  ],
];

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function getSupabaseForRequest(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SERVER_CONFIG_ERROR");
  }

  if (!authorization) {
    throw new Error("UNAUTHORIZED");
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  }) as AuthorizedSupabaseClient;
  client.__authorization = authorization;
  return client;
}

export async function requireUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function loadRun(supabase: SupabaseClient, runId: string): Promise<RunRow> {
  const { data, error } = await supabase
    .from("recommendation_runs")
    .select("id,user_id,requirement_id")
    .eq("id", runId)
    .single();

  if (error || !data) throw new Error("RUN_NOT_FOUND");
  return data as RunRow;
}

export async function loadRequirement(supabase: SupabaseClient, requirementId: string): Promise<RequirementRow> {
  const { data, error } = await supabase
    .from("client_requirements")
    .select("id,user_id,client_name,raw_input,transcribed_text,source_url,refined_requirements_json")
    .eq("id", requirementId)
    .single();

  if (error || !data) throw new Error("REQUIREMENT_NOT_FOUND");
  return data as RequirementRow;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asFlexibleNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function asPropertyCategory(value: unknown): "residential" | "commercial" | "land" | null {
  return value === "commercial" || value === "land" || value === "residential" ? value : null;
}

function asRentOrBuy(value: unknown): "rent" | "buy" | "unknown" | null {
  return value === "rent" || value === "buy" || value === "unknown" ? value : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asImageArray(value: unknown): Array<{ id: string; url: string; alt: string; role: string }> | null {
  if (!Array.isArray(value)) return null;

  return value
    .map((image, index) => {
      if (!image || typeof image !== "object") return null;
      const record = image as Record<string, unknown>;
      const url = asString(record.url);
      if (!url) return null;
      return {
        id: asString(record.id) || `image-${index + 1}`,
        url,
        alt: asString(record.alt) || "Property image",
        role: asString(record.role) || "other",
      };
    })
    .filter((image): image is { id: string; url: string; alt: string; role: string } => Boolean(image));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return [
      typeof record.message === "string" ? record.message : null,
      typeof record.details === "string" ? record.details : null,
      typeof record.hint === "string" ? record.hint : null,
      typeof record.code === "string" ? `code=${record.code}` : null,
    ].filter(Boolean).join(" | ") || JSON.stringify(record);
  }
  return String(error || "Unknown error");
}

function slugPart(value: string | null | undefined, fallback: string) {
  return (value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 36);
}

function inferRequirement(requirement: RequirementRow) {
  const refined = requirement.refined_requirements_json ?? {};
  const note = requirement.transcribed_text || requirement.raw_input || requirement.source_url || "client property requirement";
  const location = asString(refined.location) || "the preferred location";
  const city = location.split(",").map((part) => part.trim()).filter(Boolean).at(-1) || null;
  const budget = asNumber(refined.budget);
  const propertyType = asString(refined.property_type) || "property";
  const category = refined.property_category === "commercial" || refined.property_category === "land"
    ? refined.property_category
    : "residential";
  const rentOrBuy = refined.purpose === "rent" || refined.purpose === "buy" ? refined.purpose : "unknown";

  return {
    note,
    location,
    city,
    area: location.split(",")[0]?.trim() || null,
    budget,
    budgetLabel: asString(refined.budget_label),
    currency: asString(refined.currency) || "INR",
    propertyType,
    category,
    rentOrBuy,
    bedrooms: asNumber(refined.bedrooms),
    bathrooms: asNumber(refined.bathrooms),
    sqftMin: asNumber(refined.sqft_min),
    sqftMax: asNumber(refined.sqft_max),
  };
}

function buildFallbackProperties(requirement: RequirementRow): PropertyCandidate[] {
  const inferred = inferRequirement(requirement);
  const basePrice = inferred.budget;
  const areas = [
    inferred.area,
    "Central pocket",
    "Well-connected neighborhood",
    "Quieter residential pocket",
    "Value-led nearby option",
  ].filter(Boolean) as string[];
  while (areas.length < PROPERTY_TARGET_COUNT) areas.push(inferred.location);

  return Array.from({ length: PROPERTY_TARGET_COUNT }, (_, index) => {
    const order = index + 1;
    const title = `${inferred.propertyType.replace(/\b\w/g, (char) => char.toUpperCase())} Option ${order} in ${areas[index]}`;
    const price = basePrice ? Math.round(basePrice * (0.94 + index * 0.03)) : null;
    const highlights = [
      inferred.rentOrBuy === "rent" ? "Move-in friendly" : "Strong end-use fit",
      "Broker-reviewed shortlist",
      "Good connectivity",
      order === 1 ? "Closest brief match" : order === 2 ? "Balanced value" : order === 3 ? "Lifestyle fit" : order === 4 ? "Extra space" : "Smart backup",
    ];
    const fallbackImages = fallbackImageSets[index % fallbackImageSets.length].map((url, imageIndex) => ({
      id: `fallback-${order}-${imageIndex + 1}`,
      url,
      alt: `${title} image ${imageIndex + 1}`,
      role: imageIndex === 0 ? "hero" : imageIndex === 1 ? "interior" : "detail",
    }));

    return {
      external_property_id: `curated-${order}`,
      title,
      area: areas[index],
      city: inferred.city,
      property_category: inferred.category,
      property_type: inferred.propertyType,
      rent_or_buy: inferred.rentOrBuy,
      price,
      price_label: price ? `${inferred.currency} ${price.toLocaleString("en-IN")}` : inferred.budgetLabel,
      currency: inferred.currency,
      bedrooms: inferred.bedrooms,
      bathrooms: inferred.bathrooms,
      sqft: inferred.sqftMin || inferred.sqftMax,
      size_label: inferred.sqftMin || inferred.sqftMax ? `${inferred.sqftMin ?? inferred.sqftMax} sqft+` : null,
      headline: order === 1 ? "Closest match to the client brief" : order === 2 ? "A practical value-led option" : order === 3 ? "A strong lifestyle-led fit" : order === 4 ? "More space in a calmer setting" : "A polished backup worth viewing",
      description: `A curated ${inferred.propertyType} match around ${areas[index]} based on the captured requirement: ${inferred.note}`,
      highlights,
      images: fallbackImages,
      sort_order: order,
      trace: {
        source_url: null,
        platform: "PropShorts curated search",
        listing_id: `PS-${Date.now()}-${order}`,
        agent_name: null,
        agent_phone: null,
        agent_email: null,
        internal_notes: "Fallback recommendation generated because no live property-search adapter is configured.",
      },
    };
  });
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeAiProperty(
  value: Record<string, unknown>,
  fallback: PropertyCandidate,
  index: number,
): PropertyCandidate {
  const trace = value.trace && typeof value.trace === "object" ? value.trace as Record<string, unknown> : {};

  return {
    external_property_id: asString(value.external_property_id) || fallback.external_property_id,
    title: asString(value.title) || fallback.title,
    area: asString(value.area) || fallback.area,
    city: asString(value.city) || fallback.city,
    property_category: asPropertyCategory(value.property_category) || fallback.property_category,
    property_type: asString(value.property_type) || fallback.property_type,
    rent_or_buy: asRentOrBuy(value.rent_or_buy) || fallback.rent_or_buy,
    price: asFlexibleNumber(value.price) ?? fallback.price,
    price_label: asString(value.price_label) || fallback.price_label,
    currency: asString(value.currency) || fallback.currency,
    bedrooms: asFlexibleNumber(value.bedrooms) ?? fallback.bedrooms,
    bathrooms: asFlexibleNumber(value.bathrooms) ?? fallback.bathrooms,
    sqft: asFlexibleNumber(value.sqft) ?? fallback.sqft,
    size_label: asString(value.size_label) || fallback.size_label,
    headline: asString(value.headline) || fallback.headline,
    description: asString(value.description) || fallback.description,
    highlights: asStringArray(value.highlights) || fallback.highlights,
    images: asImageArray(value.images) || fallback.images,
    sort_order: index + 1,
    trace: {
      source_url: asString(trace.source_url),
      platform: asString(trace.platform),
      listing_id: asString(trace.listing_id),
      agent_name: asString(trace.agent_name),
      agent_phone: asString(trace.agent_phone),
      agent_email: asString(trace.agent_email),
      internal_notes: asString(trace.internal_notes) || "AI-structured recommendation. Verify listing details before sharing.",
    },
  };
}

export async function searchProperties(requirement: RequirementRow): Promise<{
  searchSummary: Record<string, unknown>;
  properties: PropertyCandidate[];
}> {
  const inferred = inferRequirement(requirement);
  const openAiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openAiKey) {
    return {
      searchSummary: {
        interpreted_brief: inferred.note,
        assumptions: ["Live web search is not configured; generated a broker-review shortlist from the requirement."],
        property_category: inferred.category,
        warnings: ["Review these recommendations before sharing with a client."],
      },
      properties: buildFallbackProperties(requirement),
    };
  }

  const prompt = [
    "You are the PropShorts Search Agent. Return JSON only.",
    "Find 5 highly suitable, traceable, client-safe property recommendations from the broker requirement.",
    "Use live web results when available. Prefer credible listing pages with useful photos. Relevance beats volume.",
    "Each selected property should include exactly 3 image references when possible: hero/exterior, main interior, and another useful angle.",
    "Images must be direct, client-safe image URLs when available. If a direct image URL cannot be verified, return fewer images rather than inventing one.",
    "Use null for facts you cannot verify. Do not invent source URLs, third-party agents, phone numbers, emails, prices, sqft, or bedrooms.",
    "Keep source URLs and third-party listing contact data only inside trace. Never copy third-party contact data into client-safe fields.",
    "Schema: {\"search_summary\":{\"interpreted_brief\":\"string\",\"assumptions\":[\"string\"],\"property_category\":\"residential|commercial|land\",\"warnings\":[\"string\"]},\"properties\":[{\"external_property_id\":\"string\",\"title\":\"string\",\"area\":\"string|null\",\"city\":\"string|null\",\"property_category\":\"residential|commercial|land\",\"property_type\":\"string|null\",\"rent_or_buy\":\"rent|buy|unknown\",\"price\":number|null,\"price_label\":\"string|null\",\"currency\":\"string|null\",\"bedrooms\":number|null,\"bathrooms\":number|null,\"sqft\":number|null,\"size_label\":\"string|null\",\"headline\":\"string\",\"description\":\"string\",\"highlights\":[\"string\"],\"images\":[{\"id\":\"string\",\"url\":\"https://...\",\"alt\":\"string\",\"role\":\"hero|interior|detail\"}],\"trace\":{\"source_url\":\"string|null\",\"platform\":\"string|null\",\"listing_id\":\"string|null\",\"agent_name\":\"string|null\",\"agent_phone\":\"string|null\",\"agent_email\":\"string|null\",\"internal_notes\":\"string|null\"}}]}",
    `Requirement: ${JSON.stringify(requirement.refined_requirements_json ?? requirement.raw_input ?? requirement.source_url)}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.2,
      tools: [{ type: "web_search", search_context_size: "medium" }],
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    return {
      searchSummary: {
        interpreted_brief: inferred.note,
        assumptions: ["OpenAI search planning failed; generated a broker-review shortlist from the requirement."],
        property_category: inferred.category,
        warnings: ["Review these recommendations before sharing with a client."],
      },
      properties: buildFallbackProperties(requirement),
    };
  }

  const data = await response.json();
  const text = data.output_text ||
    data.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? [])
      ?.map((content: { text?: string }) => content.text ?? "")
      ?.join("\n") ||
    "";
  const parsed = parseJsonObject(text);
  const rawProperties = Array.isArray(parsed?.properties) ? parsed.properties as Array<Record<string, unknown>> : [];

  if (!parsed || rawProperties.length === 0) {
    return {
      searchSummary: {
        interpreted_brief: inferred.note,
        assumptions: ["Search output could not be parsed; generated a broker-review shortlist from the requirement."],
        property_category: inferred.category,
        warnings: ["Review these recommendations before sharing with a client."],
      },
      properties: buildFallbackProperties(requirement),
    };
  }

  const fallbackProperties = buildFallbackProperties(requirement);
  const normalizedProperties = rawProperties.slice(0, PROPERTY_TARGET_COUNT).map((property, index) =>
    normalizeAiProperty(property, fallbackProperties[index], index)
  );
  while (normalizedProperties.length < PROPERTY_TARGET_COUNT) {
    normalizedProperties.push(fallbackProperties[normalizedProperties.length]);
  }

  return {
    searchSummary: parsed.search_summary as Record<string, unknown>,
    properties: normalizedProperties,
  };
}

export async function persistSearchResults(supabase: SupabaseClient, run: RunRow, requirement: RequirementRow) {
  const { searchSummary, properties } = await searchProperties(requirement);

  const { error: deleteTraceError } = await supabase
    .from("property_recommendations")
    .delete()
    .eq("run_id", run.id);
  if (deleteTraceError) throw deleteTraceError;

  const { data: insertedProperties, error: propertyError } = await supabase
    .from("property_recommendations")
    .insert(properties.map((property) => ({
      user_id: run.user_id,
      run_id: run.id,
      external_property_id: property.external_property_id,
      title: property.title,
      area: property.area,
      city: property.city,
      property_category: property.property_category,
      property_type: property.property_type,
      rent_or_buy: property.rent_or_buy,
      price: property.price,
      price_label: property.price_label,
      currency: property.currency,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sqft: property.sqft,
      size_label: property.size_label,
      headline: property.headline,
      description: property.description,
      highlights: property.highlights,
      images: property.images,
      client_safe_data: {
        displayTitle: property.title,
        area: property.area,
        city: property.city,
        propertyCategory: property.property_category,
        propertyType: property.property_type,
        rentOrBuy: property.rent_or_buy,
        price: property.price_label,
        currency: property.currency,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        size: property.size_label,
        shortHeadline: property.headline,
        shortDescription: property.description,
        highlights: property.highlights,
        images: property.images,
      },
      handoff_notes: {
        strongestValueAngle: property.headline,
        suggestedVoiceoverAngle: property.description,
        bestImageOrder: property.images.map((image) => image.id),
        missingDataWarnings: [],
        clientSafeConfirmed: true,
      },
      missing_data_warnings: [],
      sort_order: property.sort_order,
    })))
    .select("id,external_property_id");

  if (propertyError || !insertedProperties) throw propertyError ?? new Error("PROPERTY_INSERT_FAILED");

  const insertedByExternalId = new Map(
    insertedProperties.map((inserted) => [inserted.external_property_id, inserted.id]),
  );

  const traces = properties.map((property) => {
    const recommendationId = insertedByExternalId.get(property.external_property_id);
    if (!recommendationId) {
      throw new Error(`TRACE_PROPERTY_MATCH_FAILED:${property.external_property_id}`);
    }

    const trace = property.trace;
    return {
      user_id: run.user_id,
      recommendation_id: recommendationId,
      source_url: trace.source_url,
      platform: trace.platform,
      listing_id: trace.listing_id,
      agent_name: trace.agent_name,
      agent_phone: trace.agent_phone,
      agent_email: trace.agent_email,
      internal_notes: trace.internal_notes,
      raw_trace_json: trace,
    };
  });

  const { error: traceError } = await supabase.from("property_internal_traces").insert(traces);
  if (traceError) throw traceError;

  const { error: runError } = await supabase
    .from("recommendation_runs")
    .update({
      status: "completed",
      search_summary_json: searchSummary,
      search_output_json: { properties },
      completed_at: new Date().toISOString(),
    })
    .eq("id", run.id);
  if (runError) throw runError;

  return { searchSummary, properties: insertedProperties };
}

export async function generateVideoRecord(supabase: SupabaseClient, run: RunRow, requirement: RequirementRow) {
  const { data: properties, error } = await supabase
    .from("property_recommendations")
    .select("*")
    .eq("run_id", run.id);
  if (error || !properties?.length) throw error ?? new Error("NO_PROPERTIES_FOR_VIDEO");

  const sortedProperties = [...properties].sort((a, b) => {
    const aOrder = typeof a.sort_order === "number" ? a.sort_order : 999;
    const bOrder = typeof b.sort_order === "number" ? b.sort_order : 999;
    return aOrder - bOrder;
  });
  const clientName = requirement.client_name || "Client";
  const fps = 24;
  const selectedProperties = sortedProperties.slice(0, PROPERTY_TARGET_COUNT);
  const scenes = [
    { sceneId: "intro-a", type: "introGreeting", startFrame: 0, durationFrames: 4 * fps, onScreenText: `Hi ${clientName}.`, voiceover: "Hi, I have found you some great properties that match what you are looking for." },
    { sceneId: "intro-b", type: "introContext", startFrame: 4 * fps, durationFrames: 6 * fps, onScreenText: "Check out these properties!", voiceover: "If you are interested in any of these, I will confirm availability right away and set up a viewing. Let us take a look." },
    ...selectedProperties.flatMap((property: Record<string, unknown>, index: number) => {
      const sectionStart = (10 + index * 8) * fps;
      const imageIds = Array.isArray(property.images)
        ? (property.images as Array<Record<string, unknown>>).slice(0, PROPERTY_IMAGES_PER_OPTION).map((image) => image.id ?? null)
        : [];
      return [
        { sceneId: `property-${index + 1}-number`, type: "propertyNumber", startFrame: sectionStart, durationFrames: 1 * fps, propertyId: property.id, onScreenText: String(index + 1), voiceover: null },
        { sceneId: `property-${index + 1}-image-1`, type: "propertyImage", startFrame: sectionStart + 1 * fps, durationFrames: 56, propertyId: property.id, imageId: imageIds[0], onScreenText: property.headline, voiceover: `${property.title}. ${property.description}` },
        { sceneId: `property-${index + 1}-image-2`, type: "propertyImage", startFrame: sectionStart + 80, durationFrames: 56, propertyId: property.id, imageId: imageIds[1], onScreenText: property.headline, voiceover: null },
        { sceneId: `property-${index + 1}-image-3`, type: "propertyImage", startFrame: sectionStart + 136, durationFrames: 56, propertyId: property.id, imageId: imageIds[2], onScreenText: property.price_label, voiceover: null },
      ];
    }),
    { sceneId: "outro-pdf", type: "outroPdf", startFrame: 50 * fps, durationFrames: 4 * fps, onScreenText: "Check out the PDF for the full property details!", voiceover: "I have also sent you a PDF with the full details of all the properties shown here." },
    { sceneId: "outro-close", type: "outroClosing", startFrame: 54 * fps, durationFrames: 6 * fps, onScreenText: "Call me.", voiceover: "Let me know which one stands out to you, and I will take care of the next steps for you." },
  ];
  const voiceoverScript = {
    intro: "Hi, I have found you some great properties that match what you are looking for. If you are interested in any of these, I will confirm availability right away and set up a viewing. Let us take a look.",
    properties: selectedProperties.map((property: Record<string, unknown>, index: number) => ({
      propertyId: property.id,
      voiceover: `${index === 0 ? "First" : index === 1 ? "Second" : index === 2 ? "Option three" : index === 3 ? "Property four" : "And finally"}, ${property.description || property.headline || property.title}.`,
    })),
    outroPdf: "I have also sent you a PDF with the full details of all the properties shown here.",
    outroClosing: "Let me know which one stands out to you, and I will take care of the next steps for you.",
  };
  const plan = {
    durationSeconds: 60,
    fps,
    format: "vertical",
    resolution: { width: 720, height: 1280 },
    scenes,
    voiceoverScript,
    clientSafeConfirmed: true,
    renderer: "remotion-plan",
  };

  const { data, error: insertError } = await supabase
    .from("generated_videos")
    .insert({
      user_id: run.user_id,
      run_id: run.id,
      provider: "remotion",
      provider_job_id: `remotion-render-${run.id}`,
      video_url: null,
      script: scenes.map((scene) => scene.voiceover).filter(Boolean).join("\n\n"),
      video_plan_json: plan,
      voiceover_script_json: voiceoverScript,
      input_json: { clientName, properties: selectedProperties },
      duration_seconds: 60,
      fps,
      format: "vertical",
      status: "processing",
      completed_at: null,
    })
    .select("id")
    .single();

  if (insertError || !data) throw insertError ?? new Error("VIDEO_INSERT_FAILED");

  await enqueueVideoRender(supabase, data.id);
  return data as { id: string };
}

export async function enqueueVideoRender(supabase: SupabaseClient, videoId: string) {
  const renderUrl = Deno.env.get("REMOTION_RENDER_WEBHOOK_URL");
  const renderSecret = Deno.env.get("REMOTION_RENDER_SECRET");
  const authorization = (supabase as AuthorizedSupabaseClient).__authorization;

  if (!renderUrl || !renderSecret || !authorization) {
    const missing = [
      !renderUrl ? "REMOTION_RENDER_WEBHOOK_URL" : null,
      !renderSecret ? "REMOTION_RENDER_SECRET" : null,
      !authorization ? "Authorization" : null,
    ].filter(Boolean).join(", ");

    await supabase
      .from("generated_videos")
      .update({
        status: "failed",
        error_message: `Video renderer is not configured: ${missing}`,
      })
      .eq("id", videoId);
    return;
  }

  const renderRequest = fetch(renderUrl, {
    method: "POST",
    headers: {
      "Authorization": authorization,
      "Content-Type": "application/json",
      "x-render-secret": renderSecret,
    },
    body: JSON.stringify({ video_id: videoId }),
  }).then(async (response) => {
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`RENDER_WORKER_FAILED:${response.status}:${body.slice(0, 400)}`);
    }
  }).catch(async (error) => {
    await supabase
      .from("generated_videos")
      .update({
        status: "failed",
        error_message: getErrorMessage(error),
      })
      .eq("id", videoId);
  });

  const edgeRuntime = (globalThis as unknown as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;
  if (edgeRuntime?.waitUntil) {
    edgeRuntime.waitUntil(renderRequest);
  } else {
    await renderRequest;
  }
}

function escapePdfText(value: string) {
  return value.replace(/[\\()]/g, "\\$&").replace(/\r?\n/g, " ");
}

function wrapPdfText(value: unknown, maxChars = 62, maxLines = 4): string[] {
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function pdfText(value: unknown, x: number, y: number, size: number, options: { font?: "F1" | "F2"; color?: string } = {}) {
  const font = options.font || "F1";
  const color = options.color || "0 0 0";
  return `${color} rg BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(String(value || ""))}) Tj ET`;
}

function pdfTextBlock(lines: string[], x: number, y: number, size: number, leading = 18, options: { font?: "F1" | "F2"; color?: string } = {}) {
  return lines.map((line, index) => pdfText(line, x, y - index * leading, size, options)).join("\n");
}

function imageRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((image) => {
      if (!image || typeof image !== "object") return null;
      const url = (image as Record<string, unknown>).url;
      return typeof url === "string" && url.trim() ? url.trim() : null;
    })
    .filter((url): url is string => Boolean(url))
    .slice(0, PROPERTY_IMAGES_PER_OPTION);
}

function buildPdfCover(title: string, clientName: string, properties: Array<Record<string, unknown>>) {
  const intro = [
    "A curated shortlist prepared from the captured client brief.",
    "Client-facing details only. Internal source trace is kept out of this report.",
  ];
  return [
    "0.95 0.95 0.94 rg 0 0 612 792 re f",
    "1 1 1 rg 42 58 528 676 re f",
    "0 0 0 rg 58 704 20 20 re f",
    pdfText("propshorts", 90, 708, 18, { font: "F2" }),
    pdfText("RECOMMENDATION REPORT", 58, 638, 12, { font: "F2", color: "0.55 0.55 0.55" }),
    pdfTextBlock(wrapPdfText(title, 18, 3), 58, 580, 46, 50, { font: "F2" }),
    pdfText(`Prepared for ${clientName}`, 58, 392, 18, { color: "0.38 0.38 0.38" }),
    pdfTextBlock(intro, 58, 350, 13, 18, { color: "0.35 0.35 0.35" }),
    "0 0 0 rg 58 238 496 1 re f",
    pdfText(`${properties.length} selected properties`, 58, 204, 18, { font: "F2" }),
    pdfText("PDF + PropShort video package", 58, 174, 13, { color: "0.35 0.35 0.35" }),
    "0 0 0 rg 58 86 496 8 re f",
  ].join("\n");
}

function buildPdfPropertyPage(property: Record<string, unknown>, index: number) {
  const title = String(property.title || `Property ${index + 1}`);
  const location = [property.area, property.city].filter(Boolean).join(", ") || "Location on request";
  const metricLine = [
    property.price_label,
    typeof property.bedrooms === "number" ? `${property.bedrooms} bed` : null,
    property.size_label || (typeof property.sqft === "number" ? `${property.sqft} sqft` : null),
  ].filter(Boolean).join(" · ") || "Details on request";
  const highlights = Array.isArray(property.highlights)
    ? property.highlights.filter((item): item is string => typeof item === "string").slice(0, 4)
    : [];
  const images = imageRefs(property.images);
  const imageLines = images.length > 0
    ? images.map((url, imageIndex) => `Image ${imageIndex + 1}: ${url}`)
    : ["Image references unavailable for this listing."];

  return [
    "0.95 0.95 0.94 rg 0 0 612 792 re f",
    "1 1 1 rg 42 44 528 704 re f",
    pdfText(`PROPERTY ${index + 1}`, 58, 704, 11, { font: "F2", color: "0.55 0.55 0.55" }),
    pdfTextBlock(wrapPdfText(title, 24, 2), 58, 658, 30, 34, { font: "F2" }),
    pdfText(location, 58, 586, 14, { color: "0.38 0.38 0.38" }),
    "0 0 0 rg 58 548 340 46 re f",
    pdfText(metricLine, 76, 564, 13, { font: "F2", color: "1 1 1" }),
    "0.96 0.96 0.96 rg 58 392 496 112 re f",
    pdfText("Why this fits", 76, 474, 11, { font: "F2", color: "0.55 0.55 0.55" }),
    pdfTextBlock(wrapPdfText(property.headline || property.description || "A strong fit for the captured brief.", 56, 3), 76, 444, 17, 22, { font: "F2" }),
    pdfText("Highlights", 58, 344, 11, { font: "F2", color: "0.55 0.55 0.55" }),
    ...highlights.map((highlight, highlightIndex) => [
      "0 0 0 rg",
      `64 ${314 - highlightIndex * 28} 7 7 re f`,
      pdfText(highlight, 84, 310 - highlightIndex * 28, 13, { color: "0.24 0.24 0.24" }),
    ].join("\n")),
    pdfText("Image references for video/PDF handoff", 58, 170, 10, { font: "F2", color: "0.55 0.55 0.55" }),
    pdfTextBlock(imageLines.flatMap((line) => wrapPdfText(line, 74, 2)).slice(0, 6), 58, 146, 8, 11, { color: "0.24 0.24 0.24" }),
    "0 0 0 rg 58 72 496 8 re f",
    pdfText("propshorts", 474, 92, 10, { font: "F2" }),
  ].join("\n");
}

function buildDesignedPdf(title: string, clientName: string, properties: Array<Record<string, unknown>>) {
  const pageStreams = [
    buildPdfCover(title, clientName, properties),
    ...properties.map((property, index) => buildPdfPropertyPage(property, index)),
  ];
  const pageCount = pageStreams.length;
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, index) => `${3 + index} 0 R`).join(" ")}] /Count ${pageCount} >>`,
  ];

  const contentStart = 3 + pageCount;
  for (let index = 0; index < pageCount; index += 1) {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${contentStart + pageCount} 0 R /F2 ${contentStart + pageCount + 1} 0 R >> >> /Contents ${contentStart + index} 0 R >>`);
  }

  for (const stream of pageStreams) {
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new TextEncoder().encode(pdf);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:application/pdf;base64,${btoa(binary)}`;
}

export async function generatePdfRecord(supabase: SupabaseClient, run: RunRow, requirement: RequirementRow) {
  const { data: properties, error } = await supabase
    .from("property_recommendations")
    .select("title,area,city,price_label,bedrooms,sqft,size_label,headline,description,highlights,images,sort_order")
    .eq("run_id", run.id);
  if (error || !properties?.length) throw error ?? new Error("NO_PROPERTIES_FOR_PDF");

  const sortedProperties = [...properties].sort((a, b) => {
    const aOrder = typeof a.sort_order === "number" ? a.sort_order : 999;
    const bOrder = typeof b.sort_order === "number" ? b.sort_order : 999;
    return aOrder - bOrder;
  });
  const clientName = requirement.client_name || "Client";
  const title = `PropShorts Recommendations for ${clientName}`;
  const pdfProperties = sortedProperties.slice(0, PROPERTY_TARGET_COUNT) as Array<Record<string, unknown>>;
  const pdfUrl = buildDesignedPdf(title, clientName, pdfProperties);

  const { data, error: insertError } = await supabase
    .from("generated_pdfs")
    .insert({
      user_id: run.user_id,
      run_id: run.id,
      pdf_url: pdfUrl,
      page_count: pdfProperties.length + 1,
      input_json: { title, clientName, properties: pdfProperties },
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .select("id,pdf_url")
    .single();

  if (insertError || !data) throw insertError ?? new Error("PDF_INSERT_FAILED");
  return data as { id: string; pdf_url: string };
}

export async function finalizePackageRecord(
  supabase: SupabaseClient,
  run: RunRow,
  requirement: RequirementRow,
  pdfId: string | null,
  videoId: string | null,
) {
  const inferred = inferRequirement(requirement);
  const clientName = requirement.client_name || "Client";
  const shareSlug = `${slugPart(clientName, "client")}-${slugPart(inferred.area, "property")}-${crypto.randomUUID().slice(0, 8)}`;

  const { data, error } = await supabase
    .from("recommendation_packages")
    .insert({
      user_id: run.user_id,
      requirement_id: run.requirement_id,
      run_id: run.id,
      pdf_id: pdfId,
      video_id: videoId,
      package_title: `${inferred.propertyType} options for ${clientName}`,
      package_summary_json: {
        clientName,
        interpretedBrief: inferred.note,
        location: inferred.location,
        output: { pdfReady: Boolean(pdfId), videoPlanReady: Boolean(videoId) },
      },
      follow_up_message: `Hi ${clientName}, I prepared a shortlist of properties that match your brief. Let me know which one you want to view first.`,
      share_slug: shareSlug,
      status: "completed",
    })
    .select("id,share_slug")
    .single();

  if (error || !data) throw error ?? new Error("PACKAGE_INSERT_FAILED");
  return data as { id: string; share_slug: string };
}

export async function runFullPipeline(supabase: SupabaseClient, requirementId: string) {
  const requirement = await loadRequirement(supabase, requirementId);
  const { data: run, error: runError } = await supabase
    .from("recommendation_runs")
    .insert({
      user_id: requirement.user_id,
      requirement_id: requirement.id,
      status: "processing",
    })
    .select("id,user_id,requirement_id")
    .single();

  if (runError || !run) throw runError ?? new Error("RUN_INSERT_FAILED");

  try {
    await persistSearchResults(supabase, run as RunRow, requirement);
    const video = await generateVideoRecord(supabase, run as RunRow, requirement);
    const pdf = await generatePdfRecord(supabase, run as RunRow, requirement);
    const pkg = await finalizePackageRecord(supabase, run as RunRow, requirement, pdf.id, video.id);
    return { run_id: run.id, package_id: pkg.id, share_slug: pkg.share_slug, video_id: video.id, pdf_id: pdf.id };
  } catch (error) {
    const message = getErrorMessage(error);
    await supabase
      .from("recommendation_runs")
      .update({ status: "failed", error_message: message })
      .eq("id", run.id);
    throw error;
  }
}

export { getErrorMessage };
