import {
  corsHeaders,
  getErrorMessage,
  getSupabaseForRequest,
  jsonResponse,
  loadRun,
  processRecommendationRun,
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

  try {
    const supabase = getSupabaseForRequest(req);
    await requireUser(supabase);
    const body = await req.json() as Body;
    const runId = body.run_id?.trim();
    if (!runId) return jsonResponse({ success: false, error: { code: "RUN_ID_REQUIRED", message: "Run ID is required." } }, 400);

    const run = await loadRun(supabase, runId);
    const propertyCount = resolvePropertyTargetCount(body.property_count);
    const demoMode = body.demo_mode === true || body.demo_mode === "true" || body.demo_mode === "1";
    const task = processRecommendationRun(supabase, run, propertyCount, { demoMode }).catch(() => undefined);
    const edgeRuntime = (globalThis as unknown as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;

    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(task);
    } else {
      void task;
    }

    return jsonResponse({ success: true, run_id: run.id, status: "processing" }, 202);
  } catch (error) {
    const message = getErrorMessage(error);
    return jsonResponse({ success: false, error: { code: message, message } }, message === "UNAUTHORIZED" ? 401 : 500);
  }
});
