import {
  corsHeaders,
  getErrorMessage,
  getSupabaseForRequest,
  jsonResponse,
  loadRequirement,
  loadRun,
  persistSearchResults,
  requireUser,
  resolvePropertyTargetCount,
} from "../_shared/propshorts-pipeline.ts";

interface Body {
  run_id?: string;
  property_count?: number | string;
  demo_mode?: boolean | string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST." } }, 405);
  }

  let supabaseForFailure: ReturnType<typeof getSupabaseForRequest> | null = null;
  let runIdForFailure: string | null = null;

  try {
    const supabase = getSupabaseForRequest(req);
    supabaseForFailure = supabase;
    await requireUser(supabase);
    const body = await req.json() as Body;
    const runId = body.run_id?.trim();
    runIdForFailure = runId || null;
    if (!runId) return jsonResponse({ success: false, error: { code: "RUN_ID_REQUIRED", message: "Run ID is required." } }, 400);

    const run = await loadRun(supabase, runId);
    const requirement = await loadRequirement(supabase, run.requirement_id);
    const propertyCount = resolvePropertyTargetCount(body.property_count);
    const demoMode = body.demo_mode === true || body.demo_mode === "true" || body.demo_mode === "1";
    const result = await persistSearchResults(supabase, run, requirement, propertyCount, { demoMode });
    return jsonResponse({ success: true, run_id: run.id, search_summary: result.searchSummary, properties: result.properties });
  } catch (error) {
    const message = getErrorMessage(error);
    try {
      if (supabaseForFailure && runIdForFailure) {
        await supabaseForFailure
          .from("recommendation_runs")
          .update({
            status: "failed",
            error_message: message,
          })
          .eq("id", runIdForFailure);
      }
    } catch {
      // Keep the original function failure response if status persistence also fails.
    }

    return jsonResponse({ success: false, error: { code: message, message } }, message === "UNAUTHORIZED" ? 401 : 500);
  }
});
