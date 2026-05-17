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
  const areas = [inferred.area, "Central pocket", "Well-connected neighborhood"].filter(Boolean) as string[];
  while (areas.length < 3) areas.push(inferred.location);

  return [0, 1, 2].map((index) => {
    const order = index + 1;
    const title = `${inferred.propertyType.replace(/\b\w/g, (char) => char.toUpperCase())} Option ${order} in ${areas[index]}`;
    const price = basePrice ? Math.round(basePrice * (0.94 + index * 0.03)) : null;
    const highlights = [
      inferred.rentOrBuy === "rent" ? "Move-in friendly" : "Strong end-use fit",
      "Broker-reviewed shortlist",
      "Good connectivity",
      order === 1 ? "Closest brief match" : order === 2 ? "Balanced value" : "Premium alternative",
    ];

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
      headline: order === 1 ? "Closest match to the client brief" : order === 2 ? "A practical value-led option" : "A polished backup worth viewing",
      description: `A curated ${inferred.propertyType} match around ${areas[index]} based on the captured requirement: ${inferred.note}`,
      highlights,
      images: [],
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
    "You are the PropShorts property search planner. Return JSON only.",
    "Create 3 client-safe property recommendations from the broker requirement.",
    "Use null for facts you cannot verify. Do not invent source URLs, third-party agents, phone numbers, or emails.",
    "Schema: {\"search_summary\":{\"interpreted_brief\":\"string\",\"assumptions\":[\"string\"],\"property_category\":\"residential|commercial|land\",\"warnings\":[\"string\"]},\"properties\":[{\"external_property_id\":\"string\",\"title\":\"string\",\"area\":\"string|null\",\"city\":\"string|null\",\"property_category\":\"residential|commercial|land\",\"property_type\":\"string|null\",\"rent_or_buy\":\"rent|buy|unknown\",\"price\":number|null,\"price_label\":\"string|null\",\"currency\":\"string|null\",\"bedrooms\":number|null,\"bathrooms\":number|null,\"sqft\":number|null,\"size_label\":\"string|null\",\"headline\":\"string\",\"description\":\"string\",\"highlights\":[\"string\"],\"images\":[],\"trace\":{\"source_url\":null,\"platform\":null,\"listing_id\":null,\"agent_name\":null,\"agent_phone\":null,\"agent_email\":null,\"internal_notes\":\"string|null\"}}]}",
    `Requirement: ${JSON.stringify(requirement.refined_requirements_json ?? requirement.raw_input ?? requirement.source_url)}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4.1-mini", input: prompt, temperature: 0.2 }),
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

  return {
    searchSummary: parsed.search_summary as Record<string, unknown>,
    properties: rawProperties.slice(0, 3).map((property, index) =>
      normalizeAiProperty(property, buildFallbackProperties(requirement)[index], index)
    ),
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
  const scenes = [
    { sceneId: "intro-a", type: "introGreeting", startFrame: 0, durationFrames: 120, onScreenText: `Hi ${clientName}.`, voiceover: null },
    { sceneId: "intro-b", type: "introContext", startFrame: 90, durationFrames: 90, onScreenText: "Check out these properties!", voiceover: "Hi, I found a few properties that match what you are looking for." },
    ...sortedProperties.map((property: Record<string, unknown>, index: number) => ({
      sceneId: `property-${index + 1}`,
      type: "propertyImage",
      startFrame: 180 + index * 180,
      durationFrames: 180,
      propertyId: property.id,
      onScreenText: property.headline,
      voiceover: `${property.title}. ${property.description}`,
    })),
    { sceneId: "outro-pdf", type: "outroPdf", startFrame: 720, durationFrames: 90, onScreenText: "Check out the PDF for the full property details!", voiceover: "I have also prepared a PDF with the full details." },
    { sceneId: "outro-close", type: "outroClosing", startFrame: 810, durationFrames: 90, onScreenText: "Call me.", voiceover: "Let me know which one stands out and I will take care of the next steps." },
  ];
  const voiceoverScript = {
    intro: "Hi, I found a few properties that match what you are looking for.",
    properties: sortedProperties.map((property: Record<string, unknown>) => ({
      propertyId: property.id,
      voiceover: `${property.title}. ${property.headline}`,
    })),
    outroPdf: "I have also prepared a PDF with the full details.",
    outroClosing: "Let me know which one stands out and I will take care of the next steps.",
  };
  const plan = {
    durationSeconds: 30,
    fps: 30,
    format: "vertical",
    resolution: { width: 1080, height: 1920 },
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
      input_json: { clientName, properties: sortedProperties },
      duration_seconds: 30,
      fps: 30,
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

function buildSimplePdf(title: string, lines: string[]) {
  const contentLines = [`BT /F1 22 Tf 50 770 Td (${escapePdfText(title)}) Tj`, "/F1 11 Tf 0 -34 Td"];
  for (const line of lines.slice(0, 34)) {
    contentLines.push(`(${escapePdfText(line).slice(0, 110)}) Tj 0 -18 Td`);
  }
  contentLines.push("ET");
  const stream = contentLines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
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
    .select("title,area,city,price_label,headline,highlights,sort_order")
    .eq("run_id", run.id);
  if (error || !properties?.length) throw error ?? new Error("NO_PROPERTIES_FOR_PDF");

  const sortedProperties = [...properties].sort((a, b) => {
    const aOrder = typeof a.sort_order === "number" ? a.sort_order : 999;
    const bOrder = typeof b.sort_order === "number" ? b.sort_order : 999;
    return aOrder - bOrder;
  });
  const clientName = requirement.client_name || "Client";
  const title = `PropShorts Recommendations for ${clientName}`;
  const lines = sortedProperties.flatMap((property: Record<string, unknown>, index: number) => [
    `${index + 1}. ${property.title ?? "Recommended property"}`,
    `Area: ${[property.area, property.city].filter(Boolean).join(", ") || "Not captured"}`,
    `Price: ${property.price_label ?? "On request"}`,
    `Why it fits: ${property.headline ?? "Matches the captured brief"}`,
    `Highlights: ${Array.isArray(property.highlights) ? property.highlights.join(", ") : "Broker-reviewed option"}`,
    "",
  ]);
  const pdfUrl = buildSimplePdf(title, lines);

  const { data, error: insertError } = await supabase
    .from("generated_pdfs")
    .insert({
      user_id: run.user_id,
      run_id: run.id,
      pdf_url: pdfUrl,
      page_count: 1,
      input_json: { title, clientName, properties: sortedProperties },
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
