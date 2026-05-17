import { supabase } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

export interface GeneratedPackageRow {
  id: string;
  package_title: string | null;
  created_at: string;
  pdf_id: string | null;
  video_id: string | null;
  status: string;
  share_slug: string | null;
  client_requirements: {
    client_name: string | null;
    raw_input: string | null;
    refined_requirements_json: Json | null;
  } | null;
  generated_pdfs: {
    id: string;
    pdf_url: string | null;
    status: string;
    created_at: string;
    page_count: number | null;
    input_json: Json | null;
  } | null;
  generated_videos: {
    id: string;
    video_url: string | null;
    script: string | null;
    status: string;
    created_at: string;
    video_plan_json: Json | null;
    voiceover_script_json: Json | null;
    input_json: Json | null;
  } | null;
}

export function briefFromRequirement(requirement: GeneratedPackageRow["client_requirements"]) {
  const refined = requirement?.refined_requirements_json;
  if (!refined || typeof refined !== "object" || Array.isArray(refined)) {
    return requirement?.raw_input || "Generated recommendation package";
  }

  const data = refined as Record<string, Json | undefined>;
  const location = typeof data.location === "string" ? data.location : null;
  const propertyType = typeof data.property_type === "string" ? data.property_type : null;
  const bedrooms = typeof data.bedrooms === "number" ? `${data.bedrooms}BHK` : null;
  const purpose = typeof data.purpose === "string" && data.purpose !== "unknown" ? data.purpose : null;

  return [bedrooms, propertyType, location, purpose].filter(Boolean).join(" - ") || "Generated recommendation package";
}

export function refCode(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function shortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export async function fetchGeneratedPackages() {
  const { data, error } = await supabase
    .from("recommendation_packages")
    .select(`
      id,
      package_title,
      created_at,
      pdf_id,
      video_id,
      status,
      share_slug,
      client_requirements (
        client_name,
        raw_input,
        refined_requirements_json
      ),
      generated_pdfs (
        id,
        pdf_url,
        status,
        created_at,
        page_count,
        input_json
      ),
      generated_videos (
        id,
        video_url,
        script,
        status,
        created_at,
        video_plan_json,
        voiceover_script_json,
        input_json
      )
    `);

  if (error) throw error;

  return ((data || []) as GeneratedPackageRow[]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export async function fetchPackageByPdfId(pdfId: string) {
  const packages = await fetchGeneratedPackages();
  return packages.find((item) => item.pdf_id === pdfId || item.generated_pdfs?.id === pdfId) || null;
}

export async function fetchPackageByVideoId(videoId: string) {
  const packages = await fetchGeneratedPackages();
  return packages.find((item) => item.video_id === videoId || item.generated_videos?.id === videoId) || null;
}
