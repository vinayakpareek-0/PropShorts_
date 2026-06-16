import { createServer } from "node:http";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { makeCancelSignal, renderMedia, selectComposition } from "@remotion/renderer";
import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import WebSocket from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const entryPoint = path.join(rootDir, "src/remotion/index.ts");
const port = Number(process.env.PORT || 3001);
const bucket = process.env.SUPABASE_VIDEO_BUCKET || "generated-videos";
const renderTimeoutMs = Number(process.env.REMOTION_RENDER_TIMEOUT_MS || 300000);
const cartesiaApiKey = process.env.CARTESIA_API_KEY || "";
const cartesiaVoiceId = process.env.CARTESIA_VOICE_ID || "694f9389-aac1-45b6-b726-9d9369183238";
const workerVersion = "railway-remotion-v2";

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
  return input.properties.slice(0, 5).map((property, index) => {
    const record = property && typeof property === "object" ? property : {};
    return {
      id: typeof record.id === "string" ? record.id : `property-${index + 1}`,
      title: typeof record.title === "string" ? record.title : `Property ${index + 1}`,
      area: typeof record.area === "string" ? record.area : null,
      city: typeof record.city === "string" ? record.city : null,
      price_label: typeof record.price_label === "string" ? record.price_label : null,
      bedrooms: typeof record.bedrooms === "number" ? record.bedrooms : null,
      bathrooms: typeof record.bathrooms === "number" ? record.bathrooms : null,
      sqft: typeof record.sqft === "number" ? record.sqft : null,
      size_label: typeof record.size_label === "string" ? record.size_label : null,
      headline: typeof record.headline === "string" ? record.headline : null,
      description: typeof record.description === "string" ? record.description : null,
      highlights: Array.isArray(record.highlights) ? record.highlights.filter((item) => typeof item === "string") : [],
      images: Array.isArray(record.images)
        ? record.images
          .map((image) => {
            if (typeof image === "string") return image;
            if (image && typeof image === "object" && typeof image.url === "string") return image.url;
            return null;
          })
          .filter((image) => typeof image === "string" && /^https?:\/\//i.test(image))
        : [],
    };
  });
}

function brokerProfileFromInput(input) {
  const profile = input && typeof input === "object" && input.brokerProfile && typeof input.brokerProfile === "object"
    ? input.brokerProfile
    : {};

  return {
    fullName: typeof profile.full_name === "string" && profile.full_name.trim() ? profile.full_name.trim() : "Your Property Expert",
    companyName: typeof profile.company_name === "string" && profile.company_name.trim() ? profile.company_name.trim() : "PropShorts Real Estate",
    phone: typeof profile.phone === "string" && profile.phone.trim() ? profile.phone.trim() : "Contact via broker",
    photoUrl: typeof profile.profile_photo_url === "string" && /^https?:\/\//i.test(profile.profile_photo_url) ? profile.profile_photo_url : null,
  };
}

function locationLabel(property) {
  return [property.area, property.city].filter(Boolean).join(", ") || "Location on request";
}

function narrationForVideo({ broker, properties }) {
  const propertyLines = properties.slice(0, 5).map((property, index) => {
    const ordinal = ["First", "Second", "Third", "Fourth", "Fifth"][index] || `Property ${index + 1}`;
    const location = locationLabel(property);
    const detail = property.headline || property.description || "This is a strong match for the brief.";
    const price = property.price_label ? ` The price is ${property.price_label}.` : "";
    return `${ordinal}, ${property.title || `property ${index + 1}`} in ${location}. ${detail}.${price}`;
  });

  return [
    `Here are a few properties I found for you. This is ${broker.fullName}.`,
    ...propertyLines,
    "I have also included the full PDF with more details.",
    "Call me when you are ready, and I will help with the next step.",
  ].join(" ");
}

async function generateNarrationAudio(videoId, transcript) {
  if (!cartesiaApiKey || !transcript.trim()) return null;

  const audioPath = path.join(tmpdir(), `propshort-${videoId}-voiceover.wav`);
  try {
    const response = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cartesiaApiKey}`,
        "Cartesia-Version": "2025-04-16",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: "sonic-2",
        transcript: transcript.slice(0, 3500),
        voice: { mode: "id", id: cartesiaVoiceId },
        output_format: {
          container: "wav",
          encoding: "pcm_f32le",
          sample_rate: 44100,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Cartesia TTS failed with ${response.status}: ${errorText.slice(0, 300)}`);
    }

    const audioBytes = Buffer.from(await response.arrayBuffer());
    if (audioBytes.length < 128) throw new Error("Cartesia TTS returned an empty audio file");
    await writeFile(audioPath, audioBytes);
    return audioPath;
  } catch (error) {
    console.warn(`Cartesia narration skipped: ${error instanceof Error ? error.message : String(error)}`);
    await rm(audioPath, { force: true });
    return null;
  }
}

function runFfmpeg(args, videoId) {
  if (!ffmpegPath) throw new Error("FFmpeg binary is not available");

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`FFmpeg operation timed out after ${renderTimeoutMs}ms`));
    }, renderTimeoutMs);
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 6000) stderr = stderr.slice(-6000);
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`FFmpeg exited with ${code} for video ${videoId}: ${stderr.slice(-1200)}`));
    });
  });
}

async function muxNarration({ videoId, videoPath, narrationPath, outputPath }) {
  await runFfmpeg([
    "-y",
    "-i",
    videoPath,
    "-i",
    narrationPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-shortest",
    "-movflags",
    "+faststart",
    outputPath,
  ], videoId);
}

async function getServeUrl() {
  if (!bundledServeUrl) {
    console.log("Bundling Remotion project");
    bundledServeUrl = await bundle({ entryPoint, webpackOverride: (config) => config });
    console.log("Bundled Remotion project");
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
  const properties = propertiesFromInput(input);
  const brokerProfile = brokerProfileFromInput(input);
  const silentOutputLocation = path.join(tmpdir(), `propshort-${videoId}-silent.mp4`);
  const finalOutputLocation = path.join(tmpdir(), `propshort-${videoId}.mp4`);
  const serveUrl = await getServeUrl();
  const inputProps = {
    title: `Check out these properties for ${clientName}`,
    clientName,
    script: video.script || "",
    brokerProfile,
    properties,
  };

  console.log(`[${workerVersion}] render request video=${videoId} properties=${properties.length}`);

  const composition = await selectComposition({
    serveUrl,
    id: "PropertyShort",
    inputProps,
  });

  const { cancelSignal, cancel } = makeCancelSignal();
  const timeout = setTimeout(() => {
    console.error(`Render timed out for video ${videoId} after ${renderTimeoutMs}ms`);
    cancel();
  }, renderTimeoutMs);
  let lastLoggedProgress = -1;

  try {
    console.log(`Starting Remotion render for video ${videoId}`);
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: silentOutputLocation,
      concurrency: 1,
      offthreadVideoThreads: 1,
      crf: 28,
      x264Preset: "ultrafast",
      videoBitrate: "1800k",
      encodingMaxRate: "2200k",
      encodingBufferSize: "4400k",
      disallowParallelEncoding: true,
      imageFormat: "jpeg",
      jpegQuality: 70,
      muted: true,
      timeoutInMilliseconds: 20000,
      ffmpegOverride: ({ type, args }) => {
        return ["-threads", "1", ...args];
      },
      cancelSignal,
      inputProps,
      onProgress: ({ progress, renderedFrames, encodedFrames }) => {
        const percent = Math.floor(progress * 100);
        if (percent >= lastLoggedProgress + 10 || percent === 100) {
          lastLoggedProgress = percent;
          console.log(`Render progress ${videoId}: ${percent}% (${renderedFrames ?? 0} rendered, ${encodedFrames ?? 0} encoded)`);
        }
      },
      chromiumOptions: {
        gl: "angle",
      },
    });
    console.log(`Finished Remotion render for video ${videoId}`);

    const narrationPath = await generateNarrationAudio(videoId, narrationForVideo({ broker: brokerProfile, properties }));
    const uploadPath = narrationPath ? finalOutputLocation : silentOutputLocation;

    if (narrationPath) {
      await muxNarration({
        videoId,
        videoPath: silentOutputLocation,
        narrationPath,
        outputPath: finalOutputLocation,
      });
      await rm(narrationPath, { force: true });
    }

    const bytes = await readFile(uploadPath);
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
    await rm(silentOutputLocation, { force: true });
    await rm(finalOutputLocation, { force: true });
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
      json(res, 200, { ok: true, service: "propshorts-render-worker", version: workerVersion });
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
  console.log(`PropShorts render worker listening on ${port} (${workerVersion})`);
});
