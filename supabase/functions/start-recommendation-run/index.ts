import {
  corsHeaders,
  getErrorMessage,
  getSupabaseForRequest,
  jsonResponse,
  loadRequirement,
  requireUser,
} from "../_shared/propshorts-pipeline.ts";

interface Body {
  requirement_id?: string;
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
    const requirementId = body.requirement_id?.trim();
    if (!requirementId) {
      return jsonResponse({ success: false, error: { code: "REQUIREMENT_ID_REQUIRED", message: "Requirement ID is required." } }, 400);
    }

    const requirement = await loadRequirement(supabase, requirementId);
    const { data: run, error: runError } = await supabase
      .from("recommendation_runs")
      .insert({
        user_id: requirement.user_id,
        requirement_id: requirement.id,
        status: "processing",
      })
      .select("id,status")
      .single();

    if (runError || !run) {
      throw runError ?? new Error("RUN_INSERT_FAILED");
    }

    return jsonResponse({
      success: true,
      requirement_id: requirement.id,
      run_id: run.id,
      status: run.status,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "UNAUTHORIZED" ? 401 : message === "SERVER_CONFIG_ERROR" ? 500 : 500;
    return jsonResponse({ success: false, error: { code: message, message } }, status);
  }
});
