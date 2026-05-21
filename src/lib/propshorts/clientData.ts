import { supabase } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/database.types";

export const FREE_PLAN = {
  id: "free",
  name: "Free",
  priceLabel: "$0/month",
  monthlyPropShortLimit: 3,
  monthlyPdfLimit: 3,
  features: ["Create test PropShort packages", "Generate property PDFs", "Review saved package history"],
};

export const STARTER_PLAN = {
  id: "starter",
  name: "Starter",
  priceLabel: "$20/month",
  monthlyPropShortLimit: 30,
  monthlyPdfLimit: 30,
  features: ["30 PropShort videos per month", "30 PDF reports per month", "Broker package dashboard", "Shareable package links"],
};

export const PRO_PLAN = {
  id: "pro",
  name: "Pro",
  priceLabel: "$49/month",
  monthlyPropShortLimit: 100,
  monthlyPdfLimit: 100,
  features: ["100 PropShort videos per month", "100 PDF reports per month", "Priority generation queue", "Higher monthly package volume"],
};

export const SUBSCRIPTION_PLANS = [FREE_PLAN, STARTER_PLAN, PRO_PLAN] as const;
export type SubscriptionPlanId = (typeof SUBSCRIPTION_PLANS)[number]["id"];

export type BrokerProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type BrokerSubscriptionRow = Database["public"]["Tables"]["broker_subscriptions"]["Row"];
export type PropertyRecommendationRow = Database["public"]["Tables"]["property_recommendations"]["Row"];
export type PropertyInternalTraceRow = Database["public"]["Tables"]["property_internal_traces"]["Row"];

export interface GeneratedPackageRow {
  id: string;
  run_id: string;
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
    error_message: string | null;
    created_at: string;
    updated_at: string;
    duration_seconds: number | null;
    fps: number | null;
    video_plan_json: Json | null;
    voiceover_script_json: Json | null;
    input_json: Json | null;
  } | null;
}

export interface BrokerContactRow extends PropertyInternalTraceRow {
  property: PropertyRecommendationRow | null;
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

export function publicShareUrl(shareSlug: string) {
  if (typeof window === "undefined") return `/share/${shareSlug}`;
  return `${window.location.origin}/share/${shareSlug}`;
}

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export async function fetchGeneratedPackages() {
  const { data, error } = await supabase
    .from("recommendation_packages")
    .select(`
      id,
      run_id,
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
        error_message,
        created_at,
        updated_at,
        duration_seconds,
        fps,
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

export async function fetchGeneratedPackageById(packageId: string) {
  const packages = await fetchGeneratedPackages();
  return packages.find((item) => item.id === packageId) || null;
}

export async function fetchGeneratedPackageByShareSlug(shareSlug: string) {
  const { data, error } = await supabase
    .from("recommendation_packages")
    .select(`
      id,
      run_id,
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
        error_message,
        created_at,
        updated_at,
        duration_seconds,
        fps,
        video_plan_json,
        voiceover_script_json,
        input_json
      )
    `)
    .eq("share_slug", shareSlug)
    .maybeSingle();

  if (error) throw error;
  return (data as GeneratedPackageRow | null) || null;
}

export async function fetchBrokerProfile() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as BrokerProfileRow | null) || null;
}

export async function saveBrokerProfile(values: {
  full_name: string;
  company_name: string;
  phone: string;
  email: string;
  profile_photo_url: string;
  website_url: string;
  calendar_url: string;
}) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) throw new Error("You must be signed in to save your profile.");

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        full_name: values.full_name.trim() || null,
        company_name: values.company_name.trim() || null,
        phone: values.phone.trim() || null,
        email: values.email.trim() || user.email || null,
        profile_photo_url: values.profile_photo_url.trim() || null,
        website_url: values.website_url.trim() || null,
        calendar_url: values.calendar_url.trim() || null,
        role: "broker",
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as BrokerProfileRow;
}

export async function fetchUsageSummary() {
  const packages = await fetchGeneratedPackages();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyPackages = packages.filter((item) => new Date(item.created_at) >= monthStart);

  return {
    pdfs: monthlyPackages.filter((item) => item.generated_pdfs || item.pdf_id).length,
    propshorts: monthlyPackages.filter((item) => item.generated_videos || item.video_id).length,
    packages: monthlyPackages.length,
    recent: packages.slice(0, 5),
  };
}

export async function fetchBrokerSubscription() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const user = authData.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("broker_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as BrokerSubscriptionRow | null) || null;
}

export async function createCheckoutSession(planId: Exclude<SubscriptionPlanId, "free">) {
  const { data, error } = await supabase.functions.invoke("create-checkout-session", {
    body: { plan_id: planId },
  });

  if (error) throw error;
  if (!data?.success || !data.checkout_url) {
    throw new Error(data?.error || "Could not start Stripe checkout.");
  }

  return data.checkout_url as string;
}

export async function fetchPackageBrokerContacts(packageId: string) {
  const pkg = await fetchGeneratedPackageById(packageId);
  if (!pkg) return { package: null, contacts: [] as BrokerContactRow[] };

  const { data: properties, error: propertiesError } = await supabase
    .from("property_recommendations")
    .select("*")
    .eq("run_id", pkg.run_id);

  if (propertiesError) throw propertiesError;

  const propertyRows = ((properties || []) as PropertyRecommendationRow[]).sort(
    (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999),
  );
  const propertyById = new Map(propertyRows.map((property) => [property.id, property]));
  const recommendationIds = propertyRows.map((property) => property.id);

  if (recommendationIds.length === 0) return { package: pkg, contacts: [] as BrokerContactRow[] };

  const { data: traces, error: tracesError } = await supabase
    .from("property_internal_traces")
    .select("*")
    .in("recommendation_id", recommendationIds);

  if (tracesError) throw tracesError;

  const rows = ((traces || []) as PropertyInternalTraceRow[])
    .map((trace) => ({ ...trace, property: propertyById.get(trace.recommendation_id) || null }))
    .sort((a, b) => {
      const aOrder = a.property?.sort_order ?? 999;
      const bOrder = b.property?.sort_order ?? 999;
      return aOrder - bOrder;
    });

  return { package: pkg, contacts: rows };
}

export async function fetchPackageProperties(runId: string) {
  const { data, error } = await supabase
    .from("property_recommendations")
    .select("*")
    .eq("run_id", runId);

  if (error) throw error;

  return ((data || []) as PropertyRecommendationRow[]).sort(
    (a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999),
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
