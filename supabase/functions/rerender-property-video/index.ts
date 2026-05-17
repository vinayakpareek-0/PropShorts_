import {
  corsHeaders,
  enqueueVideoRender,
  getErrorMessage,
  getSupabaseForRequest,
  jsonResponse,
  requireUser,
} from "../_shared/propshorts-pipeline.ts";

interface Body {
  video_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use POST." } }, 405);
  }

  try {
    const supabase = getSupabaseForRequest(req);
    const user = await requireUser(supabase);
    const body = await req.json() as Body;
    const videoId = body.video_id?.trim();
    if (!videoId) return jsonResponse({ success: false, error: { code: "VIDEO_ID_REQUIRED", message: "Video ID is required." } }, 400);

    const { data: video, error } = await supabase
      .from("generated_videos")
      .select("id,user_id,status")
      .eq("id", videoId)
      .single();

    if (error || !video) throw error ?? new Error("VIDEO_NOT_FOUND");
    if (video.user_id !== user.id) throw new Error("VIDEO_NOT_FOUND");

    const { error: updateError } = await supabase
      .from("generated_videos")
      .update({
        status: "processing",
        error_message: null,
        video_url: null,
        completed_at: null,
        duration_seconds: 15,
        fps: 24,
        retry_count: 0,
        provider_job_id: `remotion-rerender-${Date.now()}`,
      })
      .eq("id", videoId);

    if (updateError) throw updateError;

    await enqueueVideoRender(supabase, videoId);

    return jsonResponse({ success: true, video_id: videoId, status: "processing" });
  } catch (error) {
    const message = getErrorMessage(error);
    return jsonResponse({ success: false, error: { code: message, message } }, message === "UNAUTHORIZED" ? 401 : 500);
  }
});
