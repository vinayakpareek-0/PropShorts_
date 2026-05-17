import { createServer } from "node:http";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { makeCancelSignal, renderMedia } from "@remotion/renderer";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const entryPoint = path.join(rootDir, "src/remotion/index.ts");
const port = Number(process.env.PORT || 3001);
const bucket = process.env.SUPABASE_VIDEO_BUCKET || "generated-videos";
const renderTimeoutMs = Number(process.env.REMOTION_RENDER_TIMEOUT_MS || 240000);

let bundledServeUrl;
const renderQueue = [];
const activeVideoIds = new Set();
let isProcessingQueue = false;

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function getSupabase(accessToken) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
  });
}

function propertiesFromInput(input) {
  if (!input || typeof input !== "object" || !Array.isArray(input.properties)) return [];
  return input.properties.slice(0, 3).map((property, index) => {
    const record = property && typeof property === "object" ? property : {};
    return {
      id: typeof record.id === "string" ? record.id : `property-${index + 1}`,
      title: typeof record.title === "string" ? record.title : `Property ${index + 1}`,
      area: typeof record.area === "string" ? record.area : null,
      city: typeof record.city === "string" ? record.city : null,
      price_label: typeof record.price_label === "string" ? record.price_label : null,
      headline: typeof record.headline === "string" ? record.headline : null,
      description: typeof record.description === "string" ? record.description : null,
      highlights: Array.isArray(record.highlights) ? record.highlights.filter((item) => typeof item === "string") : [],
    };
  });
}

async function getServeUrl() {
  if (!bundledServeUrl) {
    bundledServeUrl = await bundle({ entryPoint, webpackOverride: (config) => config });
  }
  return bundledServeUrl;
}

async function markFailed(supabase, videoId, error) {
  const message = error instanceof Error ? error.message : String(error);
  await supabase
    .from("generated_videos")
    .update({
      status: "failed",
      error_message: message.slice(0, 900),
      retry_count: 1,
    })
    .eq("id", videoId);
}

async function renderVideo(videoId, accessToken) {
  const startedAt = Date.now();
  const supabase = getSupabase(accessToken);
  const { data: video, error } = await supabase
    .from("generated_videos")
    .select("*")
    .eq("id", videoId)
    .single();

  if (error || !video) throw error || new Error("Video row not found");
  if (video.status === "completed" && video.video_url?.endsWith(".mp4")) return video.video_url;

  await supabase
    .from("generated_videos")
    .update({
      status: "processing",
      error_message: null,
      provider_job_id: `render-${Date.now()}`,
    })
    .eq("id", videoId);

  const input = video.input_json && typeof video.input_json === "object" ? video.input_json : {};
  const clientName = typeof input.clientName === "string" ? input.clientName : "Client";
  const outputLocation = path.join(tmpdir(), `propshort-${videoId}.mp4`);
  const { cancelSignal, cancel } = makeCancelSignal();
  const timeout = setTimeout(() => {
    console.error(`Render timed out for video ${videoId} after ${renderTimeoutMs}ms`);
    cancel();
  }, renderTimeoutMs);
  let lastLoggedProgress = -1;

  try {
    await renderMedia({
      composition: "PropertyShort",
      serveUrl: await getServeUrl(),
      codec: "h264",
      outputLocation,
      concurrency: 1,
      crf: 24,
      disallowParallelEncoding: true,
      imageFormat: "jpeg",
      jpegQuality: 78,
      muted: true,
      timeoutInMilliseconds: 15000,
      cancelSignal,
      inputProps: {
        title: `PropShort for ${clientName}`,
        clientName,
        script: video.script || "",
        properties: propertiesFromInput(input),
      },
      onProgress: ({ progress, renderedFrames, encodedFrames }) => {
        const percent = Math.floor(progress * 100);
        if (percent >= lastLoggedProgress + 10 || percent === 100) {
          lastLoggedProgress = percent;
          console.log(
            `Render progress ${videoId}: ${percent}% (${renderedFrames ?? 0} rendered, ${encodedFrames ?? 0} encoded)`,
          );
        }
      },
      chromiumOptions: {
        gl: "angle",
      },
    });

    const bytes = await readFile(outputLocation);
    const objectPath = `${video.user_id}/${video.id}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(objectPath, bytes, {
        contentType: "video/mp4",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
    const videoUrl = publicData.publicUrl;
    const { error: updateError } = await supabase
      .from("generated_videos")
      .update({
        status: "completed",
        video_url: videoUrl,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", video.id);
    if (updateError) throw updateError;

    console.log(`Uploaded render for video ${videoId} in ${Math.round((Date.now() - startedAt) / 1000)}s`);
    return videoUrl;
  } catch (renderError) {
    await markFailed(supabase, videoId, renderError);
    throw renderError;
  } finally {
    clearTimeout(timeout);
    await rm(outputLocation, { force: true });
  }
}

function enqueueRender(videoId, accessToken) {
  if (activeVideoIds.has(videoId)) return false;
  activeVideoIds.add(videoId);
  renderQueue.push({ videoId, accessToken });
  void drainRenderQueue();
  return true;
}

async function drainRenderQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (renderQueue.length > 0) {
    const job = renderQueue.shift();
    if (!job) continue;

    try {
      console.log(`Starting render for video ${job.videoId}`);
      await renderVideo(job.videoId, job.accessToken);
      console.log(`Completed render for video ${job.videoId}`);
    } catch (error) {
      const message = error instanceof Error ? error.stack || error.message : String(error);
      console.error(`Render failed for video ${job.videoId}: ${message}`);
    } finally {
      activeVideoIds.delete(job.videoId);
    }
  }

  isProcessingQueue = false;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      json(res, 200, { ok: true, service: "propshorts-render-worker" });
      return;
    }

    if (req.method !== "POST" || req.url !== "/render") {
      json(res, 404, { success: false, error: "Not found" });
      return;
    }

    const expectedSecret = process.env.RENDER_WORKER_SECRET;
    if (!expectedSecret || req.headers["x-render-secret"] !== expectedSecret) {
      json(res, 401, { success: false, error: "Unauthorized render request" });
      return;
    }

    const body = await readJson(req);
    const videoId = typeof body.video_id === "string" ? body.video_id.trim() : "";
    const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    const accessToken = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    if (!videoId || !accessToken) {
      json(res, 400, { success: false, error: "video_id and Authorization bearer token are required" });
      return;
    }

    const queued = enqueueRender(videoId, accessToken);
    json(res, 202, {
      success: true,
      video_id: videoId,
      status: queued ? "queued" : "already_queued",
      queue_depth: renderQueue.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    json(res, 500, { success: false, error: message });
  }
});

server.listen(port, () => {
  console.log(`PropShorts render worker listening on ${port}`);
});
