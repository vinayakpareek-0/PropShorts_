import {
  corsHeaders,
  getErrorMessage,
  getSupabaseForRequest,
  jsonResponse,
  requireUser,
  runFullPipeline,
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

    const result = await runFullPipeline(supabase, requirementId);
    return jsonResponse({ success: true, status: "completed", ...result });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message === "UNAUTHORIZED" ? 401 : message === "SERVER_CONFIG_ERROR" ? 500 : 500;
    return jsonResponse({ success: false, error: { code: message, message } }, status);
  }
});
