import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";
import {
  clip,
  endPath,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
} from "https://esm.sh/pdf-lib@1.17.1";
import type { PDFImage } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

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

interface SearchOptions {
  demoMode?: boolean;
}

const PROPERTY_MAX_COUNT = 5;
const DEFAULT_PROPERTY_TARGET_COUNT = 5;
const PROPERTY_IMAGES_PER_OPTION = 3;
const SEARCH_RETRY_ATTEMPTS = 3;
const SEARCH_CANDIDATE_POOL_SIZE = 24;
const BRAND_LOGO_URL = "https://propshorts.netlify.app/top_logo.png";
const PDF_BUCKET = "generated-pdfs";
const CLIENT_SAFE_FALLBACK_WARNING = "Live property search could not return enough verified listings. Regenerate before sending to a client.";
const POPPINS_REGULAR_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf";
const POPPINS_SEMIBOLD_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf";
const POPPINS_BOLD_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf";

const fontBytesCache = new Map<string, Uint8Array>();

const demoImageSets = [
  [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=82",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=82",
    "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=82",
  ],
  [
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=82",
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=82",
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=82",
  ],
  [
    "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1400&q=82",
    "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1400&q=82",
    "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1400&q=82",
  ],
  [
    "https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=1400&q=82",
    "https://images.unsplash.com/photo-1600566753151-384129cf4e3e?auto=format&fit=crop&w=1400&q=82",
    "https://images.unsplash.com/photo-1600607688066-890987f18a86?auto=format&fit=crop&w=1400&q=82",
  ],
  [
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=82",
    "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=1400&q=82",
    "https://images.unsplash.com/photo-1600566752447-f4a4a7c88d38?auto=format&fit=crop&w=1400&q=82",
  ],
];

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function resolvePropertyTargetCount(value: unknown) {
  const count = typeof value === "number" ? value : typeof value === "string" ? Number(value) : DEFAULT_PROPERTY_TARGET_COUNT;
  return count === 3 ? 3 : PROPERTY_MAX_COUNT;
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

function buildFallbackProperties(requirement: RequirementRow, propertyTargetCount = DEFAULT_PROPERTY_TARGET_COUNT): PropertyCandidate[] {
  const inferred = inferRequirement(requirement);
  const targetCount = resolvePropertyTargetCount(propertyTargetCount);
  const basePrice = inferred.budget;
  const areas = [
    inferred.area,
    "Central pocket",
    "Well-connected neighborhood",
    "Quieter residential pocket",
    "Value-led nearby option",
  ].filter(Boolean) as string[];
  while (areas.length < targetCount) areas.push(inferred.location);

  return Array.from({ length: targetCount }, (_, index) => {
    const order = index + 1;
    const title = `${inferred.propertyType.replace(/\b\w/g, (char) => char.toUpperCase())} Option ${order} in ${areas[index]}`;
    const price = basePrice ? Math.round(basePrice * (0.94 + index * 0.03)) : null;
    const highlights = [
      inferred.rentOrBuy === "rent" ? "Move-in friendly" : "Strong end-use fit",
      "Budget aligned",
      "Good connectivity",
      order === 1 ? "Closest brief match" : order === 2 ? "Balanced value" : order === 3 ? "Lifestyle fit" : order === 4 ? "Extra space" : "Smart backup",
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
      headline: order === 1 ? "Closest match to your requirement" : order === 2 ? "A practical value-led option" : order === 3 ? "A strong lifestyle-led fit" : order === 4 ? "More space in a calmer setting" : "A polished backup worth viewing",
      description: `A ${inferred.propertyType} match around ${areas[index]} based on your requirement: ${inferred.note}`,
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
        internal_notes: CLIENT_SAFE_FALLBACK_WARNING,
      },
    };
  });
}

function buildDemoProperties(requirement: RequirementRow, propertyTargetCount = DEFAULT_PROPERTY_TARGET_COUNT): PropertyCandidate[] {
  const inferred = inferRequirement(requirement);
  const targetCount = resolvePropertyTargetCount(propertyTargetCount);
  const city = inferred.city || "Jaipur";
  const demoAreas = ["Vaishali Nagar", "Mansarovar", "Ajmer Road", "Nirman Nagar", "Jagatpura"];
  const demoTitles = [
    `Skyline ${inferred.bedrooms || 2} BHK Residence`,
    "Park View Apartment",
    "Modern Family Flat",
    "Sunlit Corner Home",
    "Quiet Lifestyle Apartment",
  ];
  const demoPrices = [42000, 38500, 46000, 41000, 39500];

  return Array.from({ length: targetCount }, (_, index) => {
    const area = demoAreas[index] || inferred.area || city;
    const price = inferred.rentOrBuy === "rent"
      ? demoPrices[index] ?? demoPrices[0]
      : 75_00_000 + index * 4_50_000;
    const title = `${demoTitles[index] || "Selected Property"} in ${area}`;
    const images = demoImageSets[index % demoImageSets.length].map((url, imageIndex) => ({
      id: `demo-${index + 1}-${imageIndex + 1}`,
      url,
      alt: `${title} image ${imageIndex + 1}`,
      role: imageIndex === 0 ? "hero" : imageIndex === 1 ? "interior" : "detail",
    }));

    return {
      external_property_id: `demo-${index + 1}`,
      title,
      area,
      city,
      property_category: inferred.category,
      property_type: inferred.propertyType || "Apartment",
      rent_or_buy: inferred.rentOrBuy,
      price,
      price_label: inferred.rentOrBuy === "rent"
        ? `INR ${price.toLocaleString("en-IN")}/month`
        : `INR ${price.toLocaleString("en-IN")}`,
      currency: inferred.currency,
      bedrooms: inferred.bedrooms || 2,
      bathrooms: inferred.bathrooms || 2,
      sqft: (inferred.sqftMin || 950) + index * 80,
      size_label: `${(inferred.sqftMin || 950) + index * 80} sqft`,
      headline: index === 0 ? "Strongest overall fit" : index === 1 ? "Best value in the shortlist" : index === 2 ? "Great lifestyle fit" : index === 3 ? "Quiet, practical everyday option" : "Reliable backup option",
      description: `A polished ${inferred.propertyType || "apartment"} option in ${area}, ${city}, selected to match the client brief for location, budget, daily convenience, and move-in comfort.`,
      highlights: [
        "Image-backed showcase ready",
        "Budget and location aligned",
        "Good everyday connectivity",
        index === 0 ? "Closest fit to the brief" : index === 1 ? "Strong value angle" : "Worth a private viewing",
      ],
      images,
      sort_order: index + 1,
      trace: {
        source_url: null,
        platform: "PropShorts demo",
        listing_id: `DEMO-${index + 1}`,
        agent_name: null,
        agent_phone: null,
        agent_email: null,
        internal_notes: "Demo package generated with controlled presentation images for sales walkthroughs.",
      },
    };
  });
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function collectResponseText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(collectResponseText).filter(Boolean).join("\n");
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  const direct = [
    typeof record.output_text === "string" ? record.output_text : null,
    typeof record.text === "string" ? record.text : null,
  ].filter(Boolean).join("\n");

  const nested = ["output", "content", "message"].map((key) => collectResponseText(record[key])).filter(Boolean).join("\n");
  return [direct, nested].filter(Boolean).join("\n");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeUrl(value: string, baseUrl?: string | null) {
  try {
    return new URL(decodeHtml(value), baseUrl || undefined).toString();
  } catch {
    return null;
  }
}

function isProbablyListingImage(url: string) {
  const lower = url.toLowerCase();
  if (!lower.startsWith("http")) return false;
  if (/(logo|icon|favicon|sprite|avatar|profile|placeholder|blank|map|staticmap)/.test(lower)) return false;
  if (/\.(svg|gif)(\?|$)/.test(lower)) return false;
  return /\.(jpg|jpeg|png|webp)(\?|$)/.test(lower) ||
    /(image|images|photo|photos|property|listing|upload|media|cdn)/.test(lower);
}

function isGenericFallbackImage(url: string) {
  const lower = url.toLowerCase();
  return lower.includes("images.unsplash.com") || lower.includes("source.unsplash.com");
}

function uniqueImageUrls(urls: string[]) {
  const seen = new Set<string>();
  return urls.filter((url) => {
    const normalized = url.split("#")[0];
    if (seen.has(normalized) || !isProbablyListingImage(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function isHtmlLike(bytes: Uint8Array) {
  const sample = new TextDecoder().decode(bytes.slice(0, 96)).toLowerCase().trimStart();
  return sample.startsWith("<!doctype") || sample.startsWith("<html") || sample.includes("<body");
}

async function probeImageUrl(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const response = await fetch(professionalImageUrl(url), {
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/jpeg,image/png,image/*,*/*;q=0.4",
        Range: "bytes=0-4095",
        "User-Agent": "Mozilla/5.0 PropShorts/1.0 (+https://propshorts.netlify.app)",
      },
    });
    if (!response.ok) return null;
    return {
      contentType: response.headers.get("content-type")?.toLowerCase() || "",
      bytes: new Uint8Array(await response.arrayBuffer()),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function isVerifiedPropertyImageUrl(url: string) {
  const normalized = normalizeUrl(url);
  if (!normalized || isGenericFallbackImage(normalized) || !isProbablyListingImage(normalized)) return false;

  const probe = await probeImageUrl(normalized);
  if (!probe || probe.bytes.length < 8 || isHtmlLike(probe.bytes)) return false;
  if (probe.contentType.includes("html") || probe.contentType.includes("text/plain")) return false;
  if (isJpg(probe.bytes) || isPng(probe.bytes)) return true;
  return probe.contentType.startsWith("image/");
}

async function filterVerifiedPropertyImages(images: Array<{ id: string; url: string; alt: string; role: string }>) {
  const checked = await Promise.all(images.map(async (image) => {
    const valid = await isVerifiedPropertyImageUrl(image.url);
    return valid ? image : null;
  }));

  return checked.filter((image): image is { id: string; url: string; alt: string; role: string } => Boolean(image));
}

async function extractListingImagesFromSource(sourceUrl: string | null, title: string) {
  if (!sourceUrl) return [];
  const normalizedSource = normalizeUrl(sourceUrl);
  if (!normalizedSource) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(normalizedSource, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 PropShorts/1.0 (+https://propshorts.netlify.app)",
      },
    });
    if (!response.ok) return [];
    const html = (await response.text()).slice(0, 900_000);
    const candidates: string[] = [];

    const metaRegex = /<meta\s+[^>]*(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
    for (const match of html.matchAll(metaRegex)) {
      const imageUrl = normalizeUrl(match[1], normalizedSource);
      if (imageUrl) candidates.push(imageUrl);
    }

    const reversedMetaRegex = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|og:image:secure_url|twitter:image|twitter:image:src)["'][^>]*>/gi;
    for (const match of html.matchAll(reversedMetaRegex)) {
      const imageUrl = normalizeUrl(match[1], normalizedSource);
      if (imageUrl) candidates.push(imageUrl);
    }

    const jsonImageRegex = /"image"\s*:\s*(?:"([^"]+)"|\[([^\]]+)\])/gi;
    for (const match of html.matchAll(jsonImageRegex)) {
      if (match[1]) {
        const imageUrl = normalizeUrl(match[1], normalizedSource);
        if (imageUrl) candidates.push(imageUrl);
      }
      if (match[2]) {
        for (const nested of match[2].matchAll(/"([^"]+)"/g)) {
          const imageUrl = normalizeUrl(nested[1], normalizedSource);
          if (imageUrl) candidates.push(imageUrl);
        }
      }
    }

    const urlRegex = /https?:\\?\/\\?\/[^"'\\\s<>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s<>]*)?/gi;
    for (const match of html.matchAll(urlRegex)) {
      const imageUrl = normalizeUrl(match[0].replace(/\\\//g, "/"), normalizedSource);
      if (imageUrl) candidates.push(imageUrl);
    }

    return uniqueImageUrls(candidates).slice(0, 12).map((url, index) => ({
      id: `source-${index + 1}`,
      url,
      alt: `${title} photo ${index + 1}`,
      role: index === 0 ? "hero" : index === 1 ? "interior" : "detail",
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function repairSearchJson(openAiKey: string, text: string, targetCount: number) {
  if (!text.trim()) return null;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        "Convert the following property-search result into strict JSON only.",
        `Return exactly the schema requested by PropShorts, with up to ${targetCount} properties. Do not add Markdown.`,
        "Keep only verified listing facts and verified image URLs. If a property has a listing page but no direct image URLs, keep trace.source_url and leave images empty.",
        text,
      ].join("\n\n"),
      temperature: 0,
    }),
  });
  if (!response.ok) return null;
  const repaired = await response.json();
  return parseJsonObject(collectResponseText(repaired));
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

async function enrichPropertyWithSourceImages(property: PropertyCandidate): Promise<PropertyCandidate> {
  const directImages = await filterVerifiedPropertyImages(
    property.images.filter((image) => image.url && !isGenericFallbackImage(image.url)),
  );
  if (directImages.length >= 2) {
    return { ...property, images: directImages.slice(0, PROPERTY_IMAGES_PER_OPTION) };
  }

  const sourceImages = await filterVerifiedPropertyImages(
    await extractListingImagesFromSource(property.trace.source_url, property.title),
  );
  if (sourceImages.length > 0) {
    const merged = [...directImages, ...sourceImages].filter((image, index, list) =>
      list.findIndex((candidate) => candidate.url === image.url) === index
    );
    return { ...property, images: merged.slice(0, PROPERTY_IMAGES_PER_OPTION) };
  }

  if (property.trace.source_url) {
    return { ...property, images: directImages.slice(0, PROPERTY_IMAGES_PER_OPTION) };
  }

  return property;
}

function propertyImageCount(property: PropertyCandidate) {
  return property.images.filter((image) => image.url && !isGenericFallbackImage(image.url)).length;
}

function propertyDedupeKey(property: PropertyCandidate) {
  return [
    property.trace.source_url,
    property.trace.listing_id,
    property.external_property_id,
    property.title,
    property.area,
  ].filter(Boolean).map((value) => String(value).toLowerCase().trim()).join("|");
}

function sortImageQualifiedProperties(properties: PropertyCandidate[]) {
  return [...properties]
    .filter((property) => propertyImageCount(property) > 0)
    .sort((a, b) => propertyImageCount(b) - propertyImageCount(a));
}

function minimumQualifiedPropertyCount(targetCount: number) {
  if (targetCount === 3) return 2;
  return targetCount;
}

async function runSearchAttempt(openAiKey: string, requirement: RequirementRow, inferred: ReturnType<typeof inferRequirement>, targetCount: number, attempt: number) {
  const breadthInstruction = attempt === 1
    ? "Search broadly first. Inspect a large candidate pool before choosing."
    : attempt === 2
      ? "The previous search did not produce enough image-backed listings. Broaden to nearby micro-markets and alternate listing portals."
      : "Final retry: search the widest credible set of live property listing pages and return only properties with verified images.";
  const prompt = [
    "You are the PropShorts Search Agent. Return JSON only.",
    `Find at least ${SEARCH_CANDIDATE_POOL_SIZE} credible live property listing candidates, then return the best image-backed matches for the broker requirement.`,
    `Need ${targetCount} final recommendations, but return up to ${SEARCH_CANDIDATE_POOL_SIZE} candidates if they have actual listing photos so the app can filter.`,
    breadthInstruction,
    "Use live web results. Prefer credible active listing pages with useful photos. Relevance beats volume after image availability.",
    "Every final property must have at least 1 real property image. Prefer 3 direct image URLs from the actual listing page: hero/exterior, main interior, and another useful angle.",
    "Direct image URLs must open as image bytes in a browser or HTTP client. Do not invent .jpg paths from listing titles and do not put listing-page URLs inside images.",
    "Never use generic stock images, generated images, placeholder images, logos, maps, or unrelated property photos.",
    "If direct image URLs cannot be verified, include the public listing page in trace.source_url so PropShorts can extract images. Do not include image-less properties unless no image-backed listings exist.",
    "Use null for facts you cannot verify. Do not invent source URLs, third-party agents, phone numbers, emails, prices, sqft, or bedrooms.",
    "Keep source URLs and third-party listing contact data only inside trace. Never copy third-party contact data into client-safe fields.",
    "Return clean client-facing copy. Do not mention brokers, internal search systems, AI, handoff, fallback, or technical workflow details in title/headline/description/highlights.",
    "Schema: {\"search_summary\":{\"interpreted_brief\":\"string\",\"assumptions\":[\"string\"],\"property_category\":\"residential|commercial|land\",\"warnings\":[\"string\"]},\"properties\":[{\"external_property_id\":\"string\",\"title\":\"string\",\"area\":\"string|null\",\"city\":\"string|null\",\"property_category\":\"residential|commercial|land\",\"property_type\":\"string|null\",\"rent_or_buy\":\"rent|buy|unknown\",\"price\":number|null,\"price_label\":\"string|null\",\"currency\":\"string|null\",\"bedrooms\":number|null,\"bathrooms\":number|null,\"sqft\":number|null,\"size_label\":\"string|null\",\"headline\":\"string\",\"description\":\"string\",\"highlights\":[\"string\"],\"images\":[{\"id\":\"string\",\"url\":\"https://...\",\"alt\":\"string\",\"role\":\"hero|interior|detail\"}],\"trace\":{\"source_url\":\"string|null\",\"platform\":\"string|null\",\"listing_id\":\"string|null\",\"agent_name\":\"string|null\",\"agent_phone\":\"string|null\",\"agent_email\":\"string|null\",\"internal_notes\":\"string|null\"}}]}",
    `Interpreted requirement: ${JSON.stringify(inferred)}`,
    `Original requirement: ${JSON.stringify(requirement.refined_requirements_json ?? requirement.raw_input ?? requirement.source_url)}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: attempt === 1 ? 0.15 : 0.25,
      tools: [{ type: "web_search", search_context_size: "high" }],
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    return {
      parsed: null,
      rawProperties: [],
      warning: `Search attempt ${attempt} failed with status ${response.status}.`,
    };
  }

  const data = await response.json();
  const text = collectResponseText(data);
  const parsed = parseJsonObject(text) || await repairSearchJson(openAiKey, text, SEARCH_CANDIDATE_POOL_SIZE);
  const rawProperties = Array.isArray(parsed?.properties) ? parsed.properties as Array<Record<string, unknown>> : [];
  return {
    parsed,
    rawProperties,
    warning: rawProperties.length === 0 ? `Search attempt ${attempt} returned no parseable properties.` : null,
  };
}

export async function searchProperties(requirement: RequirementRow, propertyTargetCount = DEFAULT_PROPERTY_TARGET_COUNT, options: SearchOptions = {}): Promise<{
  searchSummary: Record<string, unknown>;
  properties: PropertyCandidate[];
}> {
  const inferred = inferRequirement(requirement);
  const targetCount = resolvePropertyTargetCount(propertyTargetCount);
  const openAiKey = Deno.env.get("OPENAI_API_KEY");

  if (options.demoMode) {
    return {
      searchSummary: {
        interpreted_brief: inferred.note,
        assumptions: ["Demo mode uses a controlled property shortlist with reliable presentation images."],
        property_category: inferred.category,
        demo_mode: true,
        image_qualified_count: targetCount,
        warnings: [],
      },
      properties: buildDemoProperties(requirement, targetCount),
    };
  }

  if (!openAiKey) {
    return {
      searchSummary: {
        interpreted_brief: inferred.note,
        assumptions: ["Live web search is not configured; generated a requirement-based draft."],
        property_category: inferred.category,
        warnings: [CLIENT_SAFE_FALLBACK_WARNING],
      },
      properties: buildFallbackProperties(requirement, targetCount),
    };
  }

  const fallbackProperties = buildFallbackProperties(requirement, targetCount);
  const collected = new Map<string, PropertyCandidate>();
  const warnings: string[] = [];
  let latestSummary: Record<string, unknown> | null = null;

  for (let attempt = 1; attempt <= SEARCH_RETRY_ATTEMPTS; attempt += 1) {
    const { parsed, rawProperties, warning } = await runSearchAttempt(openAiKey, requirement, inferred, targetCount, attempt);
    if (warning) warnings.push(warning);
    if (parsed?.search_summary && typeof parsed.search_summary === "object") {
      latestSummary = parsed.search_summary as Record<string, unknown>;
    }

    const normalized = await Promise.all(rawProperties.slice(0, SEARCH_CANDIDATE_POOL_SIZE).map((property, index) =>
      enrichPropertyWithSourceImages(normalizeAiProperty(property, fallbackProperties[index % fallbackProperties.length], index))
    ));

    for (const property of sortImageQualifiedProperties(normalized)) {
      const key = propertyDedupeKey(property);
      if (key && !collected.has(key)) collected.set(key, { ...property, sort_order: collected.size + 1 });
    }

    if (collected.size >= targetCount) break;
  }

  const imageQualifiedProperties = Array.from(collected.values()).slice(0, targetCount).map((property, index) => ({
    ...property,
    sort_order: index + 1,
  }));

  const minimumQualifiedCount = minimumQualifiedPropertyCount(targetCount);

  if (imageQualifiedProperties.length < minimumQualifiedCount) {
    throw new Error(`IMAGE_QUALIFIED_SEARCH_FAILED: Found ${imageQualifiedProperties.length}/${targetCount} listings with real images after ${SEARCH_RETRY_ATTEMPTS} search attempts.`);
  }

  if (imageQualifiedProperties.length < targetCount) {
    warnings.push(`Search completed with ${imageQualifiedProperties.length}/${targetCount} image-qualified listings. Review before sharing.`);
  }

  return {
    searchSummary: {
      interpreted_brief: inferred.note,
      ...(latestSummary ?? {}),
      search_attempts: SEARCH_RETRY_ATTEMPTS,
      requested_property_count: targetCount,
      image_qualified_count: imageQualifiedProperties.length,
      warnings,
    },
    properties: imageQualifiedProperties,
  };
}

export async function persistSearchResults(supabase: SupabaseClient, run: RunRow, requirement: RequirementRow, propertyTargetCount = DEFAULT_PROPERTY_TARGET_COUNT, options: SearchOptions = {}) {
  const { searchSummary, properties } = await searchProperties(requirement, propertyTargetCount, options);

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

export async function generateVideoRecord(supabase: SupabaseClient, run: RunRow, requirement: RequirementRow, propertyTargetCount = DEFAULT_PROPERTY_TARGET_COUNT) {
  const { data: properties, error } = await supabase
    .from("property_recommendations")
    .select("*")
    .eq("run_id", run.id);
  if (error || !properties?.length) throw error ?? new Error("NO_PROPERTIES_FOR_VIDEO");

  const { data: brokerProfile, error: brokerError } = await supabase
    .from("profiles")
    .select("full_name,company_name,phone,email,profile_photo_url,website_url,calendar_url")
    .eq("user_id", run.user_id)
    .maybeSingle();
  if (brokerError) throw brokerError;

  const sortedProperties = [...properties].sort((a, b) => {
    const aOrder = typeof a.sort_order === "number" ? a.sort_order : 999;
    const bOrder = typeof b.sort_order === "number" ? b.sort_order : 999;
    return aOrder - bOrder;
  });
  const clientName = requirement.client_name || "Client";
  const fps = 24;
  const targetCount = resolvePropertyTargetCount(propertyTargetCount);
  const selectedProperties = sortedProperties.slice(0, targetCount);
  const outroStartSeconds = 4 + selectedProperties.length * 8;
  const durationSeconds = outroStartSeconds + 9;
  const scenes = [
    { sceneId: "intro", type: "introContext", startFrame: 0, durationFrames: 4 * fps, onScreenText: "Check out these properties!", voiceover: "I have found a few properties that match what you are looking for. Let us take a look." },
    ...selectedProperties.flatMap((property: Record<string, unknown>, index: number) => {
      const sectionStart = (4 + index * 8) * fps;
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
    { sceneId: "outro-pdf", type: "outroPdf", startFrame: outroStartSeconds * fps, durationFrames: 4 * fps, onScreenText: "Check out the PDF for the full property details!", voiceover: "I have also sent you a PDF with the full details of all the properties shown here." },
    { sceneId: "outro-close", type: "outroClosing", startFrame: (outroStartSeconds + 4) * fps, durationFrames: 5 * fps, onScreenText: "Call me.", voiceover: "Let me know which one stands out to you, and I will take care of the next steps for you." },
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
    durationSeconds,
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
      input_json: { clientName, properties: selectedProperties, brokerProfile },
      duration_seconds: durationSeconds,
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
  const shotstackApiKey = Deno.env.get("SHOTSTACK_API_KEY");
  if (shotstackApiKey) {
    const shotstackRequest = renderVideoWithShotstack(supabase, videoId, shotstackApiKey).catch(async (error) => {
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
      edgeRuntime.waitUntil(shotstackRequest);
    } else {
      await shotstackRequest;
    }
    return;
  }

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

function shotstackFitText(value: unknown, max = 72): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function shotstackWrapText(value: unknown, maxChars = 20, maxLines = 3): string {
  const words = String(value ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
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
  if (lines.length === maxLines) lines[maxLines - 1] = shotstackFitText(lines[maxLines - 1], maxChars);
  return lines.join("\n");
}

function shotstackOffset(x: number, y: number) {
  return {
    x: (x - 360) / 720,
    y: (640 - y) / 1280,
  };
}

function shotstackText(value: string, start: number, length: number, x: number, y: number, width: number, height: number, size: number, weight = 600, align: "left" | "center" = "left") {
  return {
    asset: {
      type: "text",
      text: value,
      width,
      height,
      font: {
        family: "Poppins",
        color: "#080808",
        size,
        weight,
        lineHeight: 1.05,
      },
      alignment: { horizontal: align, vertical: "center" },
      ellipsis: "...",
    },
    start,
    length,
    width,
    height,
    position: "center",
    offset: shotstackOffset(x, y),
  };
}

function shotstackWhiteText(value: string, start: number, length: number, x: number, y: number, width: number, height: number, size: number, weight = 700) {
  const clip = shotstackText(value, start, length, x, y, width, height, size, weight, "center");
  clip.asset.font.color = "#ffffff";
  return clip;
}

function shotstackImage(src: string, start: number, length: number, x: number, y: number, width: number, height: number, fit: "crop" | "contain" = "crop") {
  return {
    asset: { type: "image", src },
    start,
    length,
    width,
    height,
    fit,
    position: "center",
    offset: shotstackOffset(x, y),
  };
}

function shotstackShape(start: number, length: number, x: number, y: number, width: number, height: number, color = "#ffffff", radius = 0) {
  return {
    asset: {
      type: "shape",
      shape: "rectangle",
      width,
      height,
      fill: { color, opacity: 1 },
      stroke: { color, width: 0 },
      rectangle: { width, height, cornerRadius: radius },
    },
    start,
    length,
    width,
    height,
    position: "center",
    offset: shotstackOffset(x, y),
  };
}

function shotstackCircle(start: number, length: number, x: number, y: number, radius: number) {
  const size = radius * 2;
  return {
    asset: {
      type: "shape",
      shape: "circle",
      width: size,
      height: size,
      fill: { color: "#080808", opacity: 1 },
      stroke: { color: "#080808", width: 0 },
      circle: { radius },
    },
    start,
    length,
    width: size,
    height: size,
    position: "center",
    offset: shotstackOffset(x, y),
  };
}

function shotstackAvatarText(value: string, start: number, length: number, x: number, y: number, size: number) {
  return {
    asset: {
      type: "text",
      text: value,
      width: size,
      height: size,
      font: {
        family: "Poppins",
        color: "#ffffff",
        size: Math.round(size * 0.34),
        weight: 800,
        lineHeight: 1,
      },
      alignment: { horizontal: "center", vertical: "center" },
    },
    start,
    length,
    width: size,
    height: size,
    position: "center",
    offset: shotstackOffset(x, y),
  };
}

function shotstackOrdinal(index: number): string {
  return ["One", "Two", "Three", "Four", "Five"][index] ?? String(index + 1);
}

function shotstackPropertyImages(property: Record<string, unknown>): string[] {
  if (!Array.isArray(property.images)) return [];
  return property.images
    .map((image) => {
      if (typeof image === "string") return image;
      if (image && typeof image === "object" && typeof (image as Record<string, unknown>).url === "string") {
        return (image as Record<string, string>).url;
      }
      return "";
    })
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, PROPERTY_IMAGES_PER_OPTION);
}

function buildShotstackEdit(input: Record<string, unknown>, narrationUrl?: string | null) {
  const logoUrl = "https://propshorts.netlify.app/top_logo.png";
  const fallbackImage = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80";
  const brokerProfile = input.brokerProfile && typeof input.brokerProfile === "object" ? input.brokerProfile as Record<string, unknown> : {};
  const brokerName = shotstackFitText(brokerProfile.full_name ?? brokerProfile.fullName ?? "Your Property Expert", 26);
  const brokerCompany = shotstackFitText(brokerProfile.company_name ?? brokerProfile.companyName ?? "", 26);
  const brokerPhone = shotstackFitText(brokerProfile.phone ?? "", 22);
  const brokerPhoto = typeof brokerProfile.profile_photo_url === "string" && /^https?:\/\//i.test(brokerProfile.profile_photo_url)
    ? brokerProfile.profile_photo_url
    : typeof brokerProfile.photoUrl === "string" && /^https?:\/\//i.test(brokerProfile.photoUrl)
      ? brokerProfile.photoUrl
      : null;
  const properties = Array.isArray(input.properties) ? input.properties.slice(0, 3) as Array<Record<string, unknown>> : [];
  const propertyCount = Math.max(1, properties.length);
  const propertyImageSlideLength = Math.max(2.2, Math.min(3.5, (23 / propertyCount - 1) / 3));
  const clipsByLane: Record<number, Array<Record<string, unknown>>> = {};

  function add(lane: number, ...clips: Array<Record<string, unknown>>) {
    clipsByLane[lane] = clipsByLane[lane] ?? [];
    clipsByLane[lane].push(...clips);
  }

  function addFooter(start: number, length: number) {
    add(13, shotstackText("PS 903", start, length, 98, 1212, 120, 42, 22, 700));
    add(14, shotstackImage(logoUrl, start, length, 596, 1210, 124, 56, "contain"));
  }

  function addBrokerAvatar(start: number, length: number, x: number, y: number, size: number) {
    if (brokerPhoto) {
      add(4, shotstackImage(brokerPhoto, start, length, x, y, size, size, "contain"));
      return;
    }
    add(3, shotstackShape(start, length, x, y, size, size, "#080808", 8));
    add(4, shotstackAvatarText("PS", start, length, x, y, size));
  }

  function addBroker(start: number, length: number, y = 138) {
    add(2, shotstackShape(start, length, 360, y, 606, 154, "#f3f3f1", 12));
    addBrokerAvatar(start, length, 128, y, 112);
    const nameLine = brokerCompany ? `${brokerName} @` : brokerName;
    const companyLine = brokerCompany || "PropShorts";
    add(5, shotstackText(nameLine, start, length, 354, y - 39, 330, 36, 27, 700));
    add(6, shotstackText(companyLine, start, length, 354, y - 1, 330, 36, 27, 700));
    if (brokerPhone) add(7, shotstackText(brokerPhone, start, length, 354, y + 39, 330, 30, 21, 600));
  }

  let start = 0;
  addFooter(start, 4);
  add(10, shotstackText("Check\nOut\nThese\nProperties!", start, 4, 254, 540, 380, 390, 68, 700));
  add(3, shotstackShape(start, 4, 154, 860, 108, 108, "#f3f3f1", 6));
  addBrokerAvatar(start, 4, 154, 860, 108);
  add(5, shotstackText(brokerCompany ? `${brokerName} @` : brokerName, start, 4, 400, 824, 320, 38, 27, 700));
  add(6, shotstackText(brokerCompany || "PropShorts", start, 4, 400, 874, 320, 38, 27, 700));
  if (brokerPhone) add(7, shotstackText(brokerPhone, start, 4, 400, 924, 320, 30, 22, 600));
  start += 4;

  properties.forEach((property, index) => {
    addFooter(start, 1);
    add(1, shotstackCircle(start, 1, 360, 590, 150));
    add(9, shotstackWhiteText(String(index + 1), start, 1, 360, 590, 200, 180, 160, 800));
    start += 1;

    const images = shotstackPropertyImages(property);
    const primaryImage = images[0] ?? fallbackImage;
    const imageSet = [images[0] ?? primaryImage, images[1] ?? primaryImage, images[2] ?? primaryImage];
    for (let imageIndex = 0; imageIndex < 3; imageIndex += 1) {
      const length = propertyImageSlideLength;
      const price = shotstackFitText(property.price_label ?? "Price on request", 20).toUpperCase();
      const metrics = [
        typeof property.bedrooms === "number" ? `${property.bedrooms} BED` : null,
        typeof property.sqft === "number" ? `${Math.round(property.sqft)} SQFT` : shotstackFitText(property.size_label, 20).toUpperCase(),
        price,
      ].filter(Boolean) as string[];
      const badge = shotstackFitText(metrics[imageIndex] ?? metrics[0] ?? "DETAILS IN PDF", 20).toUpperCase();
      const badgeWidth = Math.max(156, Math.min(340, badge.length * 15 + 54));
      const badgeSize = badge.length > 15 ? 23 : badge.length > 11 ? 26 : 31;
      const location = shotstackFitText([property.area, property.city].filter(Boolean).join(", ") || property.area || property.city || "Location on request", 30);
      const headline = shotstackWrapText(property.headline ?? property.description ?? "A strong match for the brief.", 19, 3);

      addFooter(start, length);
      addBroker(start, length);
      add(0, shotstackImage(imageSet[imageIndex] ?? imageSet[0], start, length, 360, 548, 720, 570, "crop"));
      add(3, shotstackShape(start, length, 64 + badgeWidth / 2, 782, badgeWidth, 64, "#ffffff", 0));
      add(8, shotstackText(badge, start, length, 64 + badgeWidth / 2, 782, badgeWidth - 20, 48, badgeSize, 700, "center"));
      add(9, shotstackText(`Property ${shotstackOrdinal(index)}`, start, length, 180, 902, 232, 34, 23, 500));
      add(10, shotstackText(location, start, length, 310, 956, 492, 88, 30, 600));
      add(11, shotstackShape(start, length, 310, 1028, 492, 2, "#111111", 0));
      add(12, shotstackText(headline, start, length, 340, 1112, 552, 166, 37, 400));
      start += length;
    }
  });

  addFooter(start, 4);
  add(1, shotstackShape(start, 4, 360, 500, 500, 138, "#080808", 14));
  add(10, shotstackWhiteText("PDF", start, 4, 360, 500, 440, 116, 84, 500));
  add(10, shotstackText("Check out the PDF\nfor the full property\ndetails!", start, 4, 360, 695, 520, 190, 34, 400, "center"));
  start += 4;

  addFooter(start, 5);
  add(10, shotstackText("Call\nme.", start, 5, 360, 300, 460, 250, 132, 800, "center"));
  add(3, shotstackShape(start, 5, 360, 735, 148, 148, "#f3f3f1", 8));
  addBrokerAvatar(start, 5, 360, 735, 148);
  add(12, shotstackText([brokerCompany ? `${brokerName} @` : brokerName, brokerCompany || "PropShorts", brokerPhone].filter(Boolean).join("\n"), start, 5, 360, 920, 560, 180, 35, 600, "center"));

  const tracks = Object.keys(clipsByLane)
    .map(Number)
    .sort((a, b) => b - a)
    .map((lane) => ({ clips: clipsByLane[lane] }));

  if (narrationUrl) {
    tracks.unshift({
      clips: [{
        asset: {
          type: "audio",
          src: narrationUrl,
          volume: 1,
          effect: "fadeInFadeOut",
        },
        start: 0,
        length: start + 5,
      }],
    });
  }

  return {
    timeline: { background: "#ffffff", tracks, cache: true },
    output: {
      format: "mp4",
      resolution: "hd",
      aspectRatio: "9:16",
      size: { width: 720, height: 1280 },
      fps: 24,
      quality: "medium",
      destinations: [{ provider: "shotstack", exclude: false }],
    },
  };
}

function narrationWordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function dedupeNarrationSentences(value: string): string {
  const seen = new Set<string>();
  const sentences = value
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .filter((sentence) => {
      const key = sentence.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return sentences.join(" ").trim();
}

function fallbackShotstackNarrationScript(input: Record<string, unknown>): string {
  const brokerProfile = input.brokerProfile && typeof input.brokerProfile === "object" ? input.brokerProfile as Record<string, unknown> : {};
  const brokerName = shotstackFitText(brokerProfile.full_name ?? brokerProfile.fullName ?? "your broker", 28);
  const properties = Array.isArray(input.properties) ? input.properties.slice(0, 3) as Array<Record<string, unknown>> : [];
  const labels = properties.map((property, index) => {
    const location = shotstackFitText([property.area, property.city].filter(Boolean).join(", ") || property.area || property.city || property.title || `option ${index + 1}`, 32);
    return location || `option ${index + 1}`;
  });

  return [
    `Hi, this is ${brokerName}. I found ${labels.length || "a few"} options that fit the brief, using real photos, practical details, and a clear comparison.`,
    labels[0] ? `First is ${labels[0]}, a strong match for daily comfort and location.` : "The first option is a strong match for daily comfort and location.",
    labels[1] ? `Second is ${labels[1]}, giving you another practical choice to compare.` : "The second option gives you another practical choice to compare.",
    labels[2] ? `Third is ${labels[2]}, worth reviewing for value and lifestyle fit.` : "The shortlist stays focused so the decision is easier.",
    "The PDF has prices, sizes, photos, and notes in one place. Take a look, then call me and I will help you shortlist the best one.",
  ].join(" ");
}

async function shotstackNarrationScript(input: Record<string, unknown>): Promise<string> {
  const fallback = dedupeNarrationSentences(fallbackShotstackNarrationScript(input));
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) return fallback;

  const brokerProfile = input.brokerProfile && typeof input.brokerProfile === "object" ? input.brokerProfile as Record<string, unknown> : {};
  const brokerName = shotstackFitText(brokerProfile.full_name ?? brokerProfile.fullName ?? "the broker", 28);
  const properties = Array.isArray(input.properties) ? input.properties.slice(0, 3) as Array<Record<string, unknown>> : [];
  const propertyBrief = properties.map((property, index) => ({
    option: index + 1,
    title: property.title ?? null,
    area: property.area ?? null,
    city: property.city ?? null,
    price: property.price_label ?? null,
    bedrooms: property.bedrooms ?? null,
    size: property.size_label ?? property.sqft ?? null,
    headline: property.headline ?? property.description ?? null,
  }));

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          "Write one broker voiceover paragraph for a vertical real-estate shortlist video.",
          "Return plain text only. No bullets. No labels. No markdown.",
          "Length must be 85 to 95 words, designed to read naturally in about 33 to 37 seconds.",
          "Use exactly 5 sentences. Do not repeat any sentence, phrase, or idea.",
          "Mention the shortlist, briefly reference each property once, mention the PDF once, and end with a call/message invitation.",
          "Avoid saying 'I found' more than once. Avoid repeated openings like First/Second/Third if they sound mechanical.",
          `Broker name: ${brokerName}`,
          `Properties: ${JSON.stringify(propertyBrief)}`,
        ].join("\n"),
        temperature: 0.35,
        max_output_tokens: 220,
      }),
    });
    if (!response.ok) return fallback;
    const data = await response.json();
    const script = dedupeNarrationSentences(collectResponseText(data));
    const words = narrationWordCount(script);
    if (words < 75 || words > 105 || script.split(/(?<=[.!?])\s+/).length < 4) return fallback;
    return script;
  } catch {
    return fallback;
  }
}

async function createCartesiaNarration(supabase: SupabaseClient, videoId: string, userId: string, input: Record<string, unknown>): Promise<{ url: string; transcript: string } | null> {
  const apiKey = Deno.env.get("CARTESIA_API_KEY");
  if (!apiKey) return null;

  const voiceId = Deno.env.get("CARTESIA_VOICE_ID") ?? "694f9389-aac1-45b6-b726-9d9369183238";
  const transcript = (await shotstackNarrationScript(input)).slice(0, 1800);
  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Cartesia-Version": "2026-03-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: "sonic-3.5",
      transcript,
      voice: { mode: "id", id: voiceId },
      output_format: {
        container: "mp3",
        sample_rate: 44100,
      },
      generation_config: {
        speed: 1.04,
        volume: 1,
      },
      language: "en",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`CARTESIA_TTS_FAILED:${response.status}:${body.slice(0, 400)}`);
  }

  const audioBytes = new Uint8Array(await response.arrayBuffer());
  if (audioBytes.length < 128) throw new Error("CARTESIA_TTS_EMPTY_AUDIO");

  const objectPath = `${userId}/${videoId}-voiceover.mp3`;
  const { error: uploadError } = await supabase.storage
    .from("generated-videos")
    .upload(objectPath, audioBytes, {
      contentType: "audio/mpeg",
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("generated-videos").getPublicUrl(objectPath);
  return { url: data.publicUrl, transcript };
}

async function shotstackApiRequest(apiUrl: string, apiKey: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok || body.success === false) {
    throw new Error(`SHOTSTACK_FAILED:${response.status}:${JSON.stringify(body).slice(0, 700)}`);
  }
  return body;
}

async function renderVideoWithShotstack(supabase: SupabaseClient, videoId: string, apiKey: string) {
  const apiUrl = Deno.env.get("SHOTSTACK_API_URL") ?? "https://api.shotstack.io/edit/stage";
  const { data: video, error } = await supabase
    .from("generated_videos")
    .select("id,user_id,input_json")
    .eq("id", videoId)
    .single();
  if (error || !video) throw error ?? new Error("VIDEO_ROW_NOT_FOUND");

  const input = video.input_json && typeof video.input_json === "object" ? video.input_json as Record<string, unknown> : {};
  const narration = await createCartesiaNarration(supabase, video.id, video.user_id, input);
  const edit = buildShotstackEdit(input, narration?.url);
  const queued = await shotstackApiRequest(apiUrl, apiKey, "/render", {
    method: "POST",
    body: JSON.stringify(edit),
  });
  const providerJobId = queued?.response?.id;
  if (!providerJobId || typeof providerJobId !== "string") throw new Error("SHOTSTACK_RENDER_ID_MISSING");

  await supabase
    .from("generated_videos")
    .update({
      provider: "shotstack",
      provider_job_id: providerJobId,
      script: narration?.transcript ?? null,
      error_message: null,
      status: "processing",
    })
    .eq("id", videoId);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, attempt < 8 ? 5000 : 10000));
    const statusBody = await shotstackApiRequest(apiUrl, apiKey, `/render/${providerJobId}?data=false`, { method: "GET" });
    const status = statusBody?.response?.status;
    const url = statusBody?.response?.url;
    if (status === "done" && typeof url === "string" && url) {
      await supabase
        .from("generated_videos")
        .update({
          status: "completed",
          video_url: url,
          completed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", videoId);
      return;
    }
    if (status === "failed") throw new Error(`SHOTSTACK_RENDER_FAILED:${JSON.stringify(statusBody).slice(0, 700)}`);
  }

  throw new Error(`SHOTSTACK_RENDER_TIMEOUT:${providerJobId}`);
}

function wrapPdfText(value: unknown, maxChars = 62, maxLines = 4): string[] {
  const words = pdfSafeText(value).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
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

function fitPdfTextToWidth(value: string, font: PdfFont, size: number, maxWidth: number) {
  const safeValue = pdfSafeText(value);
  if (font.widthOfTextAtSize(safeValue, size) <= maxWidth) return safeValue;

  let clipped = safeValue;
  while (clipped.length > 0 && font.widthOfTextAtSize(`${clipped}...`, size) > maxWidth) {
    clipped = clipped.slice(0, -1).trimEnd();
  }
  return clipped ? `${clipped}...` : "";
}

function wrapPdfTextByWidth(value: unknown, font: PdfFont, size: number, maxWidth: number, maxLines = 4): string[] {
  const words = pdfSafeText(value)
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => fitPdfTextToWidth(word, font, size, maxWidth));
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
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

function pdfSafeText(value: unknown) {
  return String(value || "")
    .replace(/₹/g, "INR ")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/·/g, "/")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(index, index + 0x8000));
  }
  return btoa(binary);
}

function professionalImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("images.unsplash.com")) {
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "crop");
      parsed.searchParams.set("fm", "jpg");
      parsed.searchParams.set("w", "1200");
      parsed.searchParams.set("q", "76");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function imageProxyUrl(url: string) {
  return `https://wsrv.nl/?url=${encodeURIComponent(professionalImageUrl(url))}&output=jpg&w=1200&q=76`;
}

async function fetchRawImageBytes(url: string, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "image/jpeg,image/png,image/*", "User-Agent": "PropShorts/1.0" },
    });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 8 || isHtmlLike(bytes)) return null;
    return bytes;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function isJpg(bytes: Uint8Array) {
  return bytes[0] === 0xff && bytes[1] === 0xd8;
}

function isPng(bytes: Uint8Array) {
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

async function fetchImageBytes(url: string) {
  if (!url) return null;
  const direct = await fetchRawImageBytes(professionalImageUrl(url));
  if (direct && (isJpg(direct) || isPng(direct))) return direct;

  const proxied = await fetchRawImageBytes(imageProxyUrl(url), 12000);
  if (proxied && (isJpg(proxied) || isPng(proxied))) return proxied;
  return direct;
}

async function embedImage(pdfDoc: PDFDocument, bytes: Uint8Array | null) {
  if (!bytes) return null;
  try {
    if (isJpg(bytes)) return await pdfDoc.embedJpg(bytes);
    if (isPng(bytes)) return await pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
  return null;
}

async function embedImageFromUrl(pdfDoc: PDFDocument, url: string) {
  return embedImage(pdfDoc, await fetchImageBytes(url));
}

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PDF_GREEN = rgb(0.10, 0.36, 0.20);
const PDF_LIGHT_GREEN = rgb(0.90, 0.96, 0.91);
const PDF_GRAY = rgb(0.43, 0.43, 0.43);
const PDF_BORDER = rgb(0.82, 0.84, 0.82);
const PDF_SOFT = rgb(0.965, 0.965, 0.955);

type PdfPage = ReturnType<PDFDocument["addPage"]>;
type PdfFont = Awaited<ReturnType<PDFDocument["embedFont"]>>;
type PdfFonts = { regular: PdfFont; medium: PdfFont; bold: PdfFont };
type BrokerPdfProfile = {
  full_name?: string | null;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  profile_photo_url?: string | null;
  website_url?: string | null;
  calendar_url?: string | null;
};

function drawBrand(page: PdfPage, logo: PDFImage | null, fonts: PdfFonts, x = 36, y = 790, width = 108) {
  if (logo) {
    page.drawImage(logo, { x, y: y - 22, width, height: width * 0.42 });
    return;
  }
  page.drawCircle({ x: x + 12, y: y - 6, size: 12, color: rgb(0, 0, 0) });
  page.drawText("propshorts", { x: x + 30, y: y - 15, size: 17, font: fonts.bold, color: rgb(0, 0, 0) });
}

function drawTextLines(
  page: PdfPage,
  lines: string[],
  x: number,
  y: number,
  size: number,
  font: PdfFont,
  options: { color?: ReturnType<typeof rgb>; leading?: number } = {},
) {
  const leading = options.leading ?? size * 1.28;
  lines.forEach((line, index) => {
    page.drawText(pdfSafeText(line), {
      x,
      y: y - index * leading,
      size,
      font,
      color: options.color ?? rgb(0, 0, 0),
    });
  });
}

function drawCenteredTextLines(
  page: PdfPage,
  lines: string[],
  centerX: number,
  y: number,
  size: number,
  font: PdfFont,
  options: { color?: ReturnType<typeof rgb>; leading?: number } = {},
) {
  const leading = options.leading ?? size * 1.28;
  lines.forEach((line, index) => {
    const safeLine = pdfSafeText(line);
    page.drawText(safeLine, {
      x: centerX - font.widthOfTextAtSize(safeLine, size) / 2,
      y: y - index * leading,
      size,
      font,
      color: options.color ?? rgb(0, 0, 0),
    });
  });
}

async function fetchFontBytes(url: string) {
  const cached = fontBytesCache.get(url);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PDF_FONT_LOAD_FAILED:${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  fontBytesCache.set(url, bytes);
  return bytes;
}

async function loadPdfFonts(pdfDoc: PDFDocument): Promise<PdfFonts> {
  pdfDoc.registerFontkit(fontkit);
  const [regularBytes, mediumBytes, boldBytes] = await Promise.all([
    fetchFontBytes(POPPINS_REGULAR_URL),
    fetchFontBytes(POPPINS_SEMIBOLD_URL),
    fetchFontBytes(POPPINS_BOLD_URL),
  ]);

  return {
    regular: await pdfDoc.embedFont(regularBytes, { subset: true }),
    medium: await pdfDoc.embedFont(mediumBytes, { subset: true }),
    bold: await pdfDoc.embedFont(boldBytes, { subset: true }),
  };
}

function drawPdfIcon(page: PdfPage, icon: string, x: number, y: number, size = 12, color: ReturnType<typeof rgb> = PDF_GREEN) {
  const left = x;
  const bottom = y;
  const midX = x + size / 2;
  const midY = y + size / 2;
  const right = x + size;
  const top = y + size;

  if (icon === "bed") {
    page.drawRectangle({ x: left, y: bottom + 2, width: size, height: size * 0.45, borderColor: color, borderWidth: 1 });
    page.drawLine({ start: { x: left, y: bottom + 2 }, end: { x: left, y: top }, thickness: 1, color });
    page.drawRectangle({ x: left + 2, y: bottom + size * 0.48, width: size * 0.28, height: size * 0.2, borderColor: color, borderWidth: 0.8 });
    return;
  }
  if (icon === "bath") {
    page.drawRectangle({ x: left + 1, y: bottom + 2, width: size - 2, height: size * 0.42, borderColor: color, borderWidth: 1 });
    page.drawLine({ start: { x: left + 3, y: top - 2 }, end: { x: right - 2, y: top - 2 }, thickness: 1, color });
    page.drawCircle({ x: right - 2, y: top - 2, size: 1.4, color });
    return;
  }
  if (icon === "size") {
    page.drawRectangle({ x: left + 2, y: bottom + 2, width: size - 4, height: size - 4, borderColor: color, borderWidth: 1 });
    page.drawLine({ start: { x: left + 2, y: bottom + 4 }, end: { x: left + 5, y: bottom + 4 }, thickness: 1, color });
    page.drawLine({ start: { x: right - 2, y: top - 4 }, end: { x: right - 5, y: top - 4 }, thickness: 1, color });
    return;
  }
  if (icon === "home") {
    page.drawLine({ start: { x: left + 1, y: bottom + 5 }, end: { x: midX, y: top - 1 }, thickness: 1.2, color });
    page.drawLine({ start: { x: midX, y: top - 1 }, end: { x: right - 1, y: bottom + 5 }, thickness: 1.2, color });
    page.drawRectangle({ x: left + 3, y: bottom + 1, width: size - 6, height: size * 0.48, borderColor: color, borderWidth: 1 });
    return;
  }
  if (icon === "phone") {
    page.drawCircle({ x: midX, y: midY, size: size / 2, borderColor: color, borderWidth: 1 });
    page.drawLine({ start: { x: left + 4, y: top - 4 }, end: { x: right - 4, y: bottom + 4 }, thickness: 1.2, color });
    return;
  }
  if (icon === "mail") {
    page.drawRectangle({ x: left + 1, y: bottom + 2, width: size - 2, height: size - 4, borderColor: color, borderWidth: 1 });
    page.drawLine({ start: { x: left + 1, y: top - 2 }, end: { x: midX, y: midY - 1 }, thickness: 1, color });
    page.drawLine({ start: { x: right - 1, y: top - 2 }, end: { x: midX, y: midY - 1 }, thickness: 1, color });
    return;
  }
  if (icon === "web") {
    page.drawCircle({ x: midX, y: midY, size: size / 2, borderColor: color, borderWidth: 1 });
    page.drawLine({ start: { x: left + 1, y: midY }, end: { x: right - 1, y: midY }, thickness: 0.9, color });
    page.drawLine({ start: { x: midX, y: bottom + 1 }, end: { x: midX, y: top - 1 }, thickness: 0.9, color });
    return;
  }
  if (icon === "star") {
    page.drawText("*", { x: left + 1, y: bottom - 4, size: size + 8, color });
    return;
  }
  if (icon === "check") {
    page.drawLine({ start: { x: left + 2, y: midY }, end: { x: left + 5, y: bottom + 3 }, thickness: 1.6, color });
    page.drawLine({ start: { x: left + 5, y: bottom + 3 }, end: { x: right - 2, y: top - 2 }, thickness: 1.6, color });
    return;
  }

  page.drawCircle({ x: midX, y: midY, size: size / 2, borderColor: color, borderWidth: 1 });
}

function drawImageFrame(page: PdfPage, image: PDFImage | null, x: number, y: number, width: number, height: number, mode: "cover" | "contain" = "cover") {
  page.drawRectangle({ x, y, width, height, color: PDF_SOFT, borderColor: PDF_BORDER, borderWidth: 0.7 });
  if (!image) {
    page.drawText("Image pending", { x: x + 18, y: y + height / 2 - 4, size: 9, color: PDF_GRAY });
    return;
  }

  const scale = mode === "cover" ? Math.max(width / image.width, height / image.height) : Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  page.pushOperators(pushGraphicsState(), rectangle(x, y, width, height), clip(), endPath());
  page.drawImage(image, {
    x: x + (width - drawWidth) / 2,
    y: y + (height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  });
  page.pushOperators(popGraphicsState());
}

async function embedPropertyImageSet(pdfDoc: PDFDocument, property: Record<string, unknown>) {
  const urls = imageRefs(property.images);
  return Promise.all(urls.map((url) => embedImageFromUrl(pdfDoc, url)));
}

function drawHeader(page: PdfPage, logo: PDFImage | null, fonts: PdfFonts, label: string, pageNumber: number) {
  drawBrand(page, logo, fonts, 36, 800, 105);
  page.drawText(`${label.toUpperCase()}  |  PAGE ${String(pageNumber).padStart(2, "0")}`, {
    x: A4_WIDTH - 260,
    y: 790,
    size: 8.5,
    font: fonts.bold,
    color: rgb(0.2, 0.2, 0.2),
  });
}

function drawFooter(page: PdfPage, logo: PDFImage | null, fonts: PdfFonts, pageNumber: number) {
  page.drawLine({ start: { x: 36, y: 58 }, end: { x: A4_WIDTH - 36, y: 58 }, thickness: 0.7, color: PDF_BORDER });
  drawBrand(page, logo, fonts, 36, 40, 78);
  page.drawText("PROPERTY MATCH REPORT", { x: 235, y: 34, size: 8, font: fonts.bold, color: PDF_GRAY });
  page.drawText(`Page ${String(pageNumber).padStart(2, "0")}`, { x: A4_WIDTH - 82, y: 34, size: 8, font: fonts.regular, color: PDF_GRAY });
}

function reportDate() {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
}

function matchScore(index: number) {
  return Math.max(85, 95 - index * 3);
}

function propertyTitle(property: Record<string, unknown>, index: number) {
  return pdfSafeText(property.title || `Property ${index + 1}`);
}

function propertyLocation(property: Record<string, unknown>) {
  return [property.area, property.city].filter(Boolean).map(pdfSafeText).join(", ");
}

function propertyHighlights(property: Record<string, unknown>, max = 4) {
  return Array.isArray(property.highlights)
    ? property.highlights.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, max)
    : [];
}

function propertySpecs(property: Record<string, unknown>) {
  return [
    typeof property.bedrooms === "number" ? { label: "BEDROOMS", value: String(property.bedrooms) } : null,
    typeof property.bathrooms === "number" ? { label: "BATHROOMS", value: String(property.bathrooms) } : null,
    property.size_label || typeof property.sqft === "number" ? { label: typeof property.sqft === "number" ? "SQFT" : "SIZE", value: pdfSafeText(property.size_label || property.sqft) } : null,
    property.property_type ? { label: "TYPE", value: pdfSafeText(property.property_type) } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
}

function summaryCriteria(requirement: RequirementRow) {
  const inferred = inferRequirement(requirement);
  return [
    inferred.bedrooms ? `${inferred.bedrooms}+ Bedrooms` : null,
    inferred.bathrooms ? `${inferred.bathrooms}+ Bathrooms` : null,
    inferred.propertyType ? pdfSafeText(inferred.propertyType) : null,
    inferred.budgetLabel || (inferred.budget ? `Up to ${inferred.currency} ${inferred.budget.toLocaleString("en-IN")}` : null),
    inferred.location ? pdfSafeText(inferred.location) : null,
    inferred.rentOrBuy !== "unknown" ? pdfSafeText(inferred.rentOrBuy) : null,
  ].filter((item): item is string => Boolean(item)).slice(0, 8);
}

function priceRange(properties: Array<Record<string, unknown>>) {
  const prices = properties.map((property) => asFlexibleNumber(property.price)).filter((price): price is number => typeof price === "number");
  if (prices.length === 0) return "On request";
  const min = Math.min(...prices).toLocaleString("en-IN");
  const max = Math.max(...prices).toLocaleString("en-IN");
  return min === max ? `INR ${min}` : `INR ${min} - ${max}`;
}

function greetingName(clientName: string) {
  return pdfSafeText(clientName)
    .split(/\s+/)[0]
    ?.replace(/[^a-zA-Z0-9]+$/g, "") || "there";
}

function averageNumber(properties: Array<Record<string, unknown>>, key: string) {
  const values = properties.map((property) => asFlexibleNumber(property[key])).filter((value): value is number => typeof value === "number");
  if (!values.length) return "On request";
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Number.isInteger(avg) ? String(avg) : avg.toFixed(1);
}

function propertySizeLabel(property: Record<string, unknown>) {
  if (property.size_label) return pdfSafeText(property.size_label);
  if (typeof property.sqft === "number") return `${property.sqft.toLocaleString("en-IN")} sq. ft.`;
  return "On request";
}

function propertyFeatureSummary(property: Record<string, unknown>) {
  const items = propertyHighlights(property, 2);
  if (items.length > 0) return items.join(", ");
  return pdfSafeText(property.headline || property.description || "Selected for the client brief.");
}

function drawFittedRightText(
  page: PdfPage,
  text: string,
  rightX: number,
  y: number,
  maxWidth: number,
  font: PdfFonts["bold"],
  options: { size: number; minSize?: number; color?: ReturnType<typeof rgb> },
) {
  const value = pdfSafeText(text);
  const minSize = options.minSize ?? 8;
  let size = options.size;
  while (size > minSize && font.widthOfTextAtSize(value, size) > maxWidth) {
    size -= 0.5;
  }

  if (font.widthOfTextAtSize(value, size) <= maxWidth) {
    page.drawText(value, {
      x: rightX - font.widthOfTextAtSize(value, size),
      y,
      size,
      font,
      color: options.color ?? rgb(0, 0, 0),
    });
    return;
  }

  const words = value.split(" ");
  const firstLine: string[] = [];
  const secondLine: string[] = [];
  words.forEach((word) => {
    const target = font.widthOfTextAtSize([...firstLine, word].join(" "), size) <= maxWidth ? firstLine : secondLine;
    target.push(word);
  });

  [firstLine.join(" "), secondLine.join(" ")].filter(Boolean).slice(0, 2).forEach((line, index) => {
    page.drawText(line, {
      x: rightX - font.widthOfTextAtSize(line, size),
      y: y + (index === 0 ? 5 : -7),
      size,
      font,
      color: options.color ?? rgb(0, 0, 0),
    });
  });
}

function brokerName(broker: BrokerPdfProfile | null) {
  return pdfSafeText(broker?.full_name || "Your Property Expert");
}

function brokerRole(broker: BrokerPdfProfile | null) {
  return pdfSafeText(broker?.company_name || "Your Local Property Expert");
}

async function drawCoverPage(pdfDoc: PDFDocument, context: PdfContext) {
  const { properties, clientName, broker, logo, fonts, reportId, brokerPhoto } = context;
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const heroImage = await embedImageFromUrl(pdfDoc, imageRefs(properties[0]?.images)[0] || "");

  page.drawRectangle({ x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT, color: rgb(1, 1, 1) });
  page.drawCircle({ x: A4_WIDTH - 70, y: A4_HEIGHT - 130, size: 124, color: rgb(0.94, 0.98, 0.93) });
  page.drawCircle({ x: A4_WIDTH - 38, y: A4_HEIGHT - 94, size: 94, color: rgb(0.95, 0.91, 0.99) });
  drawBrand(page, logo, fonts, 54, 790, 130);
  drawTextLines(page, ["Property", "Match Report"], 54, 650, 53, fonts.regular, { leading: 56 });
  page.drawLine({ start: { x: 56, y: 568 }, end: { x: 84, y: 568 }, thickness: 2.4, color: PDF_GREEN });
  page.drawText("PREPARED FOR", { x: 54, y: 520, size: 9, font: fonts.bold, color: PDF_GRAY });
  page.drawText(pdfSafeText(clientName), { x: 54, y: 482, size: 27, font: fonts.bold, color: rgb(0, 0, 0) });
  drawImageFrame(page, heroImage, 26, 215, A4_WIDTH - 52, 230);

  page.drawRectangle({ x: 26, y: 90, width: A4_WIDTH - 52, height: 92, color: rgb(1, 1, 1), borderColor: PDF_BORDER, borderWidth: 0.8 });
  drawImageFrame(page, brokerPhoto, 50, 112, 70, 50);
  page.drawText("SENT BY", { x: 140, y: 148, size: 8, font: fonts.bold, color: PDF_GRAY });
  page.drawText(brokerName(broker), { x: 140, y: 126, size: 18, font: fonts.bold, color: rgb(0, 0, 0) });
  page.drawText(brokerRole(broker), { x: 140, y: 108, size: 11, font: fonts.regular, color: rgb(0.18, 0.18, 0.18) });
  page.drawLine({ start: { x: 330, y: 110 }, end: { x: 330, y: 160 }, thickness: 0.7, color: PDF_BORDER });
  const contacts = [broker?.phone, broker?.email, broker?.website_url].filter(Boolean).slice(0, 3);
  contacts.forEach((item, index) => {
    drawPdfIcon(page, ["phone", "mail", "web"][index], 360, 145 - index * 24, 12, PDF_GREEN);
    page.drawText(pdfSafeText(item), { x: 382, y: 148 - index * 24, size: 10, font: fonts.regular, color: rgb(0.1, 0.1, 0.1) });
  });
  page.drawLine({ start: { x: 26, y: 70 }, end: { x: A4_WIDTH - 26, y: 70 }, thickness: 0.7, color: PDF_BORDER });
  page.drawText("Report Date", { x: 28, y: 40, size: 9, font: fonts.regular, color: PDF_GRAY });
  page.drawText(reportDate(), { x: 112, y: 40, size: 10, font: fonts.bold, color: rgb(0, 0, 0) });
  page.drawText("Report ID", { x: A4_WIDTH - 162, y: 40, size: 9, font: fonts.regular, color: PDF_GRAY });
  page.drawText(reportId, { x: A4_WIDTH - 92, y: 40, size: 10, font: fonts.bold, color: rgb(0, 0, 0) });
}

function drawSummaryPage(context: PdfContext) {
  const { properties, clientName, requirement, logo, fonts } = context;
  const page = context.pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawHeader(page, logo, fonts, "Summary", 2);
  page.drawText(`Hi ${greetingName(clientName)},`, { x: 36, y: 670, size: 38, font: fonts.regular, color: rgb(0, 0, 0) });
  drawTextLines(
    page,
    wrapPdfText(`Thanks for sharing your requirements. I have selected ${properties.length} properties that best match your criteria and goals.`, 34, 5),
    36,
    610,
    12.5,
    fonts.regular,
    { leading: 20 },
  );

  page.drawText("YOUR CRITERIA", { x: 318, y: 690, size: 9, font: fonts.bold, color: rgb(0, 0, 0) });
  const criteria = summaryCriteria(requirement);
  criteria.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 318 + col * 126;
    const y = 636 - row * 48;
    page.drawRectangle({ x, y, width: 116, height: 34, color: rgb(1, 1, 1), borderColor: PDF_BORDER, borderWidth: 0.8 });
    drawPdfIcon(page, index === 0 ? "bed" : index === 1 ? "bath" : index === 2 ? "home" : index === 3 ? "star" : "check", x + 12, y + 11, 12, PDF_GREEN);
    page.drawText(pdfSafeText(item).slice(0, 18), { x: x + 34, y: y + 12, size: 8.7, font: fonts.regular, color: rgb(0.1, 0.1, 0.1) });
  });

  page.drawText(`WHY THESE ${properties.length} PROPERTIES?`, { x: 36, y: 470, size: 11, font: fonts.bold, color: rgb(0, 0, 0) });
  [
    ["Carefully matched", "Each home aligns tightly with your must-haves and long-term objectives."],
    ["Strong long-term value", "Properties with practical pricing, location strength, and daily usability."],
    ["Great lifestyle fit", "Spaces that support how you live, from commute to weekend comfort."],
  ].forEach(([title, body], index) => {
    const y = 400 - index * 82;
    page.drawRectangle({ x: 36, y, width: 42, height: 42, color: PDF_GREEN });
    drawPdfIcon(page, index === 0 ? "star" : index === 1 ? "check" : "size", 50, y + 13, 14, rgb(0.92, 0.72, 0.25));
    page.drawText(title, { x: 96, y: y + 28, size: 13, font: fonts.bold, color: rgb(0, 0, 0) });
    drawTextLines(page, wrapPdfText(body, 42, 2), 96, y + 10, 9.5, fonts.regular, { color: rgb(0.2, 0.2, 0.2), leading: 13 });
    if (index < 2) page.drawLine({ start: { x: 36, y: y - 22 }, end: { x: 280, y: y - 22 }, thickness: 0.7, color: PDF_BORDER });
  });

  page.drawRectangle({ x: 318, y: 185, width: 242, height: 286, color: rgb(1, 1, 1), borderColor: PDF_BORDER, borderWidth: 0.8 });
  page.drawText("AT A GLANCE", { x: 338, y: 438, size: 13, font: fonts.bold, color: rgb(0, 0, 0) });
  [
    ["Properties", String(properties.length)],
    ["Best Match Score", `${matchScore(0)}%`],
    ["Price Range", priceRange(properties)],
    ["Avg Bedrooms", averageNumber(properties, "bedrooms")],
    ["Avg Bathrooms", averageNumber(properties, "bathrooms")],
    ["Avg Size", averageNumber(properties, "sqft") === "On request" ? "On request" : `${averageNumber(properties, "sqft")} sqft`],
  ].forEach(([label, value], index) => {
    const y = 392 - index * 38;
    page.drawText(label, { x: 338, y, size: 10, font: fonts.regular, color: rgb(0.18, 0.18, 0.18) });
    drawFittedRightText(page, value, 540, y + 1, 112, fonts.bold, { size: 10.5, minSize: 8 });
    if (index < 5) page.drawLine({ start: { x: 338, y: y - 16 }, end: { x: 540, y: y - 16 }, thickness: 0.5, color: PDF_BORDER });
  });

  page.drawRectangle({ x: 36, y: 88, width: A4_WIDTH - 72, height: 58, color: rgb(1, 1, 1), borderColor: PDF_BORDER, borderWidth: 0.8 });
  page.drawCircle({ x: 74, y: 117, size: 14, color: PDF_LIGHT_GREEN });
  drawPdfIcon(page, "check", 67, 110, 14, PDF_GREEN);
  page.drawText("All properties are ready for your review.", { x: 106, y: 112, size: 12, font: fonts.bold, color: rgb(0, 0, 0) });
  drawFooter(page, logo, fonts, 2);
}

async function drawOverviewPage(context: PdfContext) {
  const { pdfDoc, properties, logo, fonts } = context;
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawHeader(page, logo, fonts, "Property Overview", 3);
  page.drawText(`Your ${properties.length} Best Matches`, { x: 36, y: 716, size: 32, font: fonts.regular, color: rgb(0, 0, 0) });

  const images = await Promise.all(properties.map((property) => embedImageFromUrl(pdfDoc, imageRefs(property.images)[0] || "")));
  properties.slice(0, 5).forEach((property, index) => {
    const x = 36;
    const y = 555 - index * 126;
    const w = A4_WIDTH - 72;
    const h = 106;
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1), borderColor: PDF_BORDER, borderWidth: 0.8 });
    drawImageFrame(page, images[index], x + 8, y + 8, 130, h - 16);
    page.drawCircle({ x: x + 22, y: y + h - 24, size: 13, color: rgb(0, 0, 0) });
    page.drawText(String(index + 1), { x: x + 18, y: y + h - 29, size: 13, font: fonts.bold, color: rgb(1, 1, 1) });
    page.drawRectangle({ x: x + 14, y: y + 16, width: 76, height: 24, color: rgb(1, 1, 1), borderColor: PDF_BORDER, borderWidth: 0.6 });
    page.drawText(`${matchScore(index)}%`, { x: x + 24, y: y + 26, size: 11.5, font: fonts.bold, color: PDF_GREEN });
    page.drawText("MATCH", { x: x + 55, y: y + 27, size: 6, font: fonts.bold, color: PDF_GREEN });
    const tx = x + 158;
    drawTextLines(page, wrapPdfText(propertyTitle(property, index), 36, 2), tx, y + h - 28, 10.5, fonts.bold, { leading: 12 });
    page.drawText(propertyLocation(property).slice(0, 42), { x: tx, y: y + h - 56, size: 8.5, font: fonts.regular, color: rgb(0, 0, 0) });
    const specs = propertySpecs(property).slice(0, 2);
    specs.forEach((spec, specIndex) => {
      drawPdfIcon(page, spec.label === "BEDROOMS" ? "bed" : spec.label === "BATHROOMS" ? "bath" : spec.label === "SQFT" || spec.label === "SIZE" ? "size" : "home", tx, y + 24 - specIndex * 15, 8, PDF_GREEN);
      page.drawText(`${spec.value} ${spec.label.toLowerCase()}`, { x: tx + 14, y: y + 28 - specIndex * 15, size: 7.8, font: fonts.regular, color: rgb(0.2, 0.2, 0.2) });
    });
    drawFittedRightText(page, pdfSafeText(property.price_label || "Price on request"), x + w - 20, y + 22, 120, fonts.bold, { size: 9.5, minSize: 7.5 });
  });

  page.drawRectangle({ x: 36, y: 82, width: A4_WIDTH - 72, height: 54, color: PDF_SOFT, borderColor: PDF_BORDER, borderWidth: 0.8 });
  page.drawCircle({ x: 70, y: 109, size: 18, color: PDF_GREEN });
  page.drawText("*", { x: 64, y: 101, size: 25, font: fonts.bold, color: rgb(0.92, 0.72, 0.25) });
  page.drawText("TOP PICK", { x: 108, y: 116, size: 7, font: fonts.bold, color: PDF_GREEN });
  page.drawText(propertyTitle(properties[0], 0).slice(0, 46), { x: 108, y: 99, size: 10.5, font: fonts.bold, color: rgb(0, 0, 0) });
  page.drawText(`${matchScore(0)}% match`, { x: A4_WIDTH - 118, y: 104, size: 10, font: fonts.bold, color: PDF_GREEN });
  drawFooter(page, logo, fonts, 3);
}

function drawComparisonTablePage(context: PdfContext) {
  const { pdfDoc, properties, logo, fonts } = context;
  const pageNumber = 4 + properties.length;
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawHeader(page, logo, fonts, "Comparison", pageNumber);

  page.drawText("Comparison Table", {
    x: 36,
    y: 704,
    size: 42,
    font: fonts.regular,
    color: rgb(0, 0, 0),
  });

  const tableX = 36;
  const tableWidth = A4_WIDTH - 72;
  const columns = [
    { label: "Property", x: tableX, width: 180 },
    { label: "Size", x: tableX + 190, width: 72 },
    { label: "Price", x: tableX + 278, width: 114 },
    { label: "Features", x: tableX + 406, width: 118 },
  ];
  const headerY = 640;
  const rowStartGap = 50;
  const rowHeight = 66;
  const cellPadding = 5;

  columns.forEach((column) => {
    page.drawText(column.label, {
      x: column.x,
      y: headerY,
      size: 13.5,
      font: fonts.regular,
      color: rgb(0.05, 0.05, 0.05),
    });
  });

  properties.slice(0, 5).forEach((property, index) => {
    const y = headerY - rowStartGap - index * rowHeight;
    const rowColor = index % 2 === 0 ? rgb(0.9, 0.91, 0.91) : rgb(1, 1, 1);
    page.drawRectangle({ x: tableX, y: y - 12, width: tableWidth, height: rowHeight - 12, color: rowColor });

    drawTextLines(page, wrapPdfTextByWidth(propertyTitle(property, index), fonts.regular, 9.5, columns[0].width - cellPadding * 2, 3), columns[0].x + cellPadding, y + 22, 9.5, fonts.regular, { leading: 11 });
    drawTextLines(page, wrapPdfTextByWidth(propertySizeLabel(property), fonts.regular, 9.2, columns[1].width - cellPadding * 2, 2), columns[1].x + cellPadding, y + 22, 9.2, fonts.regular, { leading: 11 });
    drawTextLines(page, wrapPdfTextByWidth(pdfSafeText(property.price_label || "On request"), fonts.regular, 9.2, columns[2].width - cellPadding * 2, 2), columns[2].x + cellPadding, y + 22, 9.2, fonts.regular, { leading: 11 });
    drawTextLines(page, wrapPdfTextByWidth(propertyFeatureSummary(property), fonts.regular, 8.6, columns[3].width - cellPadding * 2, 3), columns[3].x + cellPadding, y + 22, 8.6, fonts.regular, { leading: 10 });
  });

  page.drawRectangle({ x: 36, y: 120, width: tableWidth, height: 64, color: PDF_SOFT, borderColor: PDF_BORDER, borderWidth: 0.7 });
  page.drawText("How to use this table", { x: 56, y: 157, size: 12, font: fonts.bold, color: rgb(0, 0, 0) });
  drawTextLines(
    page,
    wrapPdfText("Compare the shortlist quickly across space, price, and standout features before choosing which homes to review or inspect first.", 82, 2),
    56,
    139,
    9.5,
    fonts.regular,
    { color: rgb(0.2, 0.2, 0.2), leading: 13 },
  );
  drawFooter(page, logo, fonts, pageNumber);
}

function drawSpecRow(page: PdfPage, property: Record<string, unknown>, fonts: PdfFonts, y: number) {
  const specs = propertySpecs(property).slice(0, 5);
  const width = 520 / Math.max(1, specs.length);
  specs.forEach((spec, index) => {
    const x = 40 + index * width;
    drawPdfIcon(page, spec.label === "BEDROOMS" ? "bed" : spec.label === "BATHROOMS" ? "bath" : spec.label === "SQFT" || spec.label === "SIZE" ? "size" : "home", x + 4, y - 2, 13, PDF_GREEN);
    page.drawText(spec.value, { x: x + 24, y: y + 1, size: 11, font: fonts.bold, color: rgb(0, 0, 0) });
    page.drawText(spec.label, { x: x + 24, y: y - 14, size: 7.5, font: fonts.regular, color: rgb(0.2, 0.2, 0.2) });
    if (index > 0) page.drawLine({ start: { x, y: y - 10 }, end: { x, y: y + 24 }, thickness: 0.5, color: PDF_BORDER });
  });
}

async function drawPropertyDetailPage(context: PdfContext, property: Record<string, unknown>, index: number) {
  const { pdfDoc, properties, logo, fonts } = context;
  const pageNumber = 4 + index;
  const images = await embedPropertyImageSet(pdfDoc, property);
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawHeader(page, logo, fonts, "Property Match Report", pageNumber);
  page.drawLine({ start: { x: 36, y: 760 }, end: { x: A4_WIDTH - 36, y: 760 }, thickness: 0.7, color: PDF_BORDER });
  page.drawText("PROPERTY DETAIL", { x: 36, y: 730, size: 10, font: fonts.bold, color: PDF_GREEN });
  page.drawText(`PROPERTY ${index + 1} OF ${properties.length}`, { x: 36, y: 706, size: 8, font: fonts.bold, color: PDF_GRAY });
  drawTextLines(page, wrapPdfText(propertyTitle(property, index), 30, 2), 36, 670, 22, fonts.regular, { leading: 26 });
  const badgeY = 612;
  if (index === 0) {
    page.drawRectangle({ x: 36, y: badgeY, width: 64, height: 18, color: PDF_LIGHT_GREEN, borderColor: PDF_GREEN, borderWidth: 0.8 });
    page.drawText("TOP PICK", { x: 46, y: badgeY + 5, size: 8, font: fonts.bold, color: PDF_GREEN });
  } else if (index === 1) {
    page.drawRectangle({ x: 36, y: badgeY, width: 72, height: 18, color: PDF_LIGHT_GREEN, borderColor: PDF_GREEN, borderWidth: 0.8 });
    page.drawText("BEST VALUE", { x: 45, y: badgeY + 5, size: 8, font: fonts.bold, color: PDF_GREEN });
  }
  page.drawRectangle({ x: 430, y: 612, width: 130, height: 46, color: PDF_SOFT, borderColor: PDF_BORDER, borderWidth: 0.6 });
  page.drawText(`${matchScore(index)}%`, { x: 450, y: 630, size: 14, font: fonts.bold, color: PDF_GREEN });
  page.drawText("MATCH SCORE", { x: 492, y: 634, size: 7, font: fonts.bold, color: PDF_GREEN });
  page.drawText("Brief fit", { x: 494, y: 622, size: 7.2, font: fonts.regular, color: rgb(0.2, 0.2, 0.2) });

  drawImageFrame(page, images[0] || null, 36, 398, 524, 202);
  drawImageFrame(page, images[1] || images[0] || null, 36, 288, 164, 90);
  drawImageFrame(page, images[2] || images[0] || null, 215, 288, 164, 90);
  drawImageFrame(page, images[3] || images[0] || null, 394, 288, 166, 90);
  drawSpecRow(page, property, fonts, 244);
  page.drawLine({ start: { x: 36, y: 220 }, end: { x: A4_WIDTH - 36, y: 220 }, thickness: 0.7, color: PDF_BORDER });

  page.drawText("DESCRIPTION", { x: 36, y: 190, size: 8, font: fonts.bold, color: rgb(0, 0, 0) });
  drawTextLines(page, wrapPdfText(property.description || property.headline || "A strong match for your requirements.", 36, 7), 36, 165, 8.8, fonts.regular, { color: rgb(0.16, 0.16, 0.16), leading: 14 });
  page.drawText("HIGHLIGHTS", { x: 238, y: 190, size: 8, font: fonts.bold, color: rgb(0, 0, 0) });
  propertyHighlights(property, 4).forEach((highlight, hIndex) => {
    page.drawCircle({ x: 242, y: 164 - hIndex * 23, size: 2, color: PDF_GREEN });
    drawTextLines(page, wrapPdfText(highlight, 30, 2), 252, 160 - hIndex * 23, 8, fonts.regular, { color: rgb(0.17, 0.17, 0.17), leading: 10 });
  });
  page.drawRectangle({ x: 420, y: 104, width: 140, height: 88, color: PDF_SOFT });
  page.drawLine({ start: { x: 420, y: 104 }, end: { x: 420, y: 192 }, thickness: 1.1, color: PDF_GREEN });
  page.drawText("VALUE ANGLE", { x: 448, y: 165, size: 8, font: fonts.bold, color: rgb(0, 0, 0) });
  drawTextLines(page, wrapPdfText(property.headline || "Strong fit for your goals.", 25, 4), 442, 144, 8.6, fonts.regular, { color: rgb(0.16, 0.16, 0.16), leading: 13 });
  drawFooter(page, logo, fonts, pageNumber);
}

async function drawContactPage(context: PdfContext) {
  const { pdfDoc, properties, broker, logo, fonts, brokerPhoto } = context;
  const pageNumber = 5 + properties.length;
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  drawHeader(page, logo, fonts, "Property Match Report", pageNumber);
  page.drawText("Let's take the next step.", { x: 42, y: 650, size: 29, font: fonts.bold, color: rgb(0, 0, 0) });
  page.drawLine({ start: { x: 43, y: 628 }, end: { x: 72, y: 628 }, thickness: 1.4, color: PDF_GREEN });
  drawTextLines(page, wrapPdfText("I would love to walk you through these properties and help you find the right one. Here is how we can move forward.", 56, 3), 42, 595, 12.5, fonts.regular, { leading: 22 });

  ["Review", "Shortlist", "Inspect"].forEach((step, index) => {
    const x = 70 + index * 135;
    page.drawCircle({ x, y: 500, size: 18, color: rgb(0, 0, 0) });
    page.drawText(String(index + 1), { x: x - 5, y: 494, size: 15, font: fonts.bold, color: rgb(1, 1, 1) });
    if (index < 2) page.drawLine({ start: { x: x + 55, y: 500 }, end: { x: x + 105, y: 500 }, thickness: 1, color: PDF_BORDER });
    page.drawText(step, { x: x - 25, y: 450, size: 12, font: fonts.bold, color: rgb(0, 0, 0) });
  });

  page.drawRectangle({ x: 38, y: 305, width: 340, height: 74, color: rgb(1, 1, 1), borderColor: PDF_BORDER, borderWidth: 0.8 });
  page.drawText("Ready to chat?", { x: 96, y: 352, size: 13, font: fonts.bold, color: rgb(0, 0, 0) });
  page.drawText("Book a time that suits you.", { x: 96, y: 333, size: 10, font: fonts.regular, color: rgb(0.18, 0.18, 0.18) });
  drawPdfIcon(page, "phone", 58, 328, 24, PDF_GREEN);
  page.drawRectangle({ x: 238, y: 322, width: 112, height: 34, color: rgb(1, 1, 1), borderColor: PDF_GREEN, borderWidth: 0.9 });
  page.drawText("Schedule a Call", { x: 258, y: 335, size: 10, font: fonts.bold, color: PDF_GREEN });
  page.drawText("Thank you for trusting me with your property search.", { x: 42, y: 250, size: 12, font: fonts.regular, color: rgb(0.1, 0.1, 0.1) });

  const panelX = 410;
  const panelWidth = 150;
  const panelPadding = 18;
  const panelInnerX = panelX + panelPadding;
  const panelInnerWidth = panelWidth - panelPadding * 2;
  const panelCenterX = panelX + panelWidth / 2;

  page.drawRectangle({ x: panelX, y: 250, width: panelWidth, height: 395, color: rgb(1, 1, 1), borderColor: PDF_BORDER, borderWidth: 0.8 });
  drawCenteredTextLines(page, ["YOUR PROPERTY", "EXPERT"], panelCenterX, 608, 7.5, fonts.bold, { leading: 9.5 });
  page.drawLine({ start: { x: panelCenterX - 14, y: 586 }, end: { x: panelCenterX + 14, y: 586 }, thickness: 1, color: PDF_GREEN });
  drawImageFrame(page, brokerPhoto, 445, 508, 80, 62);
  drawTextLines(page, wrapPdfTextByWidth(brokerName(broker), fonts.bold, 13, panelInnerWidth, 2), panelInnerX, 482, 13, fonts.bold, { leading: 15 });
  drawTextLines(page, wrapPdfTextByWidth(brokerRole(broker), fonts.regular, 8.5, panelInnerWidth, 2), panelInnerX, 456, 8.5, fonts.regular, { color: rgb(0.15, 0.15, 0.15), leading: 11 });
  [broker?.phone, broker?.email, broker?.website_url].filter(Boolean).forEach((item, index) => {
    const y = 420 - index * 25;
    drawPdfIcon(page, ["phone", "mail", "web"][index], panelInnerX, y, 10.5, PDF_GREEN);
    drawTextLines(page, wrapPdfTextByWidth(item, fonts.regular, 7.4, panelInnerWidth - 18, 1), panelInnerX + 18, y + 3, 7.4, fonts.regular, { color: rgb(0.12, 0.12, 0.12) });
  });
  page.drawLine({ start: { x: panelInnerX, y: 330 }, end: { x: panelX + panelWidth - panelPadding, y: 330 }, thickness: 0.7, color: PDF_BORDER });
  drawCenteredTextLines(page, ["Short videos.", "Smart matches.", "Better decisions."], panelCenterX, 304, 9, fonts.medium, {
    color: rgb(0.08, 0.08, 0.08),
    leading: 13,
  });
  drawFooter(page, logo, fonts, pageNumber);
}

type PdfContext = {
  pdfDoc: PDFDocument;
  clientName: string;
  requirement: RequirementRow;
  properties: Array<Record<string, unknown>>;
  broker: BrokerPdfProfile | null;
  logo: PDFImage | null;
  brokerPhoto: PDFImage | null;
  fonts: PdfFonts;
  reportId: string;
};

async function buildDesignedPdf(clientName: string, properties: Array<Record<string, unknown>>, requirement: RequirementRow, broker: BrokerPdfProfile | null, reportId: string) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadPdfFonts(pdfDoc);
  const logo = await embedImageFromUrl(pdfDoc, BRAND_LOGO_URL);
  const brokerPhoto = broker?.profile_photo_url ? await embedImageFromUrl(pdfDoc, broker.profile_photo_url) : null;
  const context: PdfContext = { pdfDoc, clientName, requirement, properties, broker, logo, brokerPhoto, fonts, reportId };

  await drawCoverPage(pdfDoc, context);
  drawSummaryPage(context);
  await drawOverviewPage(context);
  for (const [index, property] of properties.entries()) {
    await drawPropertyDetailPage(context, property, index);
  }
  drawComparisonTablePage(context);
  await drawContactPage(context);

  return await pdfDoc.save();
}

export async function generatePdfRecord(supabase: SupabaseClient, run: RunRow, requirement: RequirementRow, propertyTargetCount = DEFAULT_PROPERTY_TARGET_COUNT) {
  const { data: properties, error } = await supabase
    .from("property_recommendations")
    .select("title,area,city,property_type,rent_or_buy,price,price_label,currency,bedrooms,bathrooms,sqft,size_label,headline,description,highlights,images,sort_order")
    .eq("run_id", run.id);
  if (error || !properties?.length) throw error ?? new Error("NO_PROPERTIES_FOR_PDF");

  const { data: brokerProfile, error: brokerError } = await supabase
    .from("profiles")
    .select("full_name,company_name,phone,email,profile_photo_url,website_url,calendar_url")
    .eq("user_id", run.user_id)
    .maybeSingle();
  if (brokerError) throw brokerError;

  const sortedProperties = [...properties].sort((a, b) => {
    const aOrder = typeof a.sort_order === "number" ? a.sort_order : 999;
    const bOrder = typeof b.sort_order === "number" ? b.sort_order : 999;
    return aOrder - bOrder;
  });
  const clientName = requirement.client_name || "Client";
  const title = "Property Shortlist";
  const targetCount = resolvePropertyTargetCount(propertyTargetCount);
  const pdfProperties = sortedProperties.slice(0, targetCount) as Array<Record<string, unknown>>;
  const pdfId = crypto.randomUUID();
  const reportId = `PS-${pdfId.slice(0, 8).toUpperCase()}`;
  const pdfBytes = await buildDesignedPdf(clientName, pdfProperties, requirement, brokerProfile as BrokerPdfProfile | null, reportId);
  const objectPath = `${run.user_id}/${pdfId}.pdf`;
  let pdfUrl = `data:application/pdf;base64,${bytesToBase64(pdfBytes)}`;
  let storagePath: string | null = null;

  const body = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
  const { error: uploadError } = await supabase.storage
    .from(PDF_BUCKET)
    .upload(objectPath, body, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (!uploadError) {
    const { data: publicData } = supabase.storage.from(PDF_BUCKET).getPublicUrl(objectPath);
    pdfUrl = publicData.publicUrl;
    storagePath = objectPath;
  } else {
    console.warn(`PDF_STORAGE_UPLOAD_FAILED:${getErrorMessage(uploadError)}`);
  }

  const { data, error: insertError } = await supabase
    .from("generated_pdfs")
    .insert({
      id: pdfId,
      user_id: run.user_id,
      run_id: run.id,
      pdf_url: pdfUrl,
      page_count: pdfProperties.length + 5,
      input_json: { title, clientName, properties: pdfProperties, brokerProfile, reportId, storagePath },
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
