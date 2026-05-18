import {
  corsHeaders,
  generateVideoRecord,
  getErrorMessage,
  getSupabaseForRequest,
  jsonResponse,
  loadRequirement,
  loadRun,
  requireUser,
  resolvePropertyTargetCount,
} from "../_shared/propshorts-pipeline.ts";

interface Body {
  run_id?: string;
  property_count?: number | string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST." } }, 405);
  }

  try {
    const supabase = getSupabaseForRequest(req);
    await requireUser(supabase);
    const body = await req.json() as Body;
    const runId = body.run_id?.trim();
    if (!runId) return jsonResponse({ success: false, error: { code: "RUN_ID_REQUIRED", message: "Run ID is required." } }, 400);

    const run = await loadRun(supabase, runId);
    const requirement = await loadRequirement(supabase, run.requirement_id);
    const propertyCount = resolvePropertyTargetCount(body.property_count);
    const video = await generateVideoRecord(supabase, run, requirement, propertyCount);
    return jsonResponse({ success: true, run_id: run.id, video_id: video.id, status: "processing" });
  } catch (error) {
    const message = getErrorMessage(error);
    return jsonResponse({ success: false, error: { code: message, message } }, message === "UNAUTHORIZED" ? 401 : 500);
  }
});
