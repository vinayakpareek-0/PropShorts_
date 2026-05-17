import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import WebSocket from "ws";

const port = Number(process.env.PORT || 3001);
const bucket = process.env.SUPABASE_VIDEO_BUCKET || "generated-videos";
const renderTimeoutMs = Number(process.env.REMOTION_RENDER_TIMEOUT_MS || 90000);

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

function fit(value, max = 78) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
}

function compact(values) {
  return values.filter((value) => typeof value === "string" && value.trim().length > 0);
}

function quoteFilterValue(value) {
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function fontFile() {
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
  ];
  return candidates.find((candidate) => existsSync(candidate)) || "";
}

function runFfmpeg(args, videoId) {
  if (!ffmpegPath) throw new Error("FFmpeg binary is not available");

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`FFmpeg render timed out after ${renderTimeoutMs}ms`));
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
        console.log(`FFmpeg render finished for video ${videoId}`);
        resolve();
        return;
      }
      reject(new Error(`FFmpeg exited with ${code}: ${stderr.slice(-1200)}`));
    });
  });
}

async function makeTextFile(videoId, name, value) {
  const filePath = path.join(tmpdir(), `propshort-${videoId}-${name}.txt`);
  await writeFile(filePath, value, "utf8");
  return filePath;
}

async function renderVideoWithFfmpeg({ videoId, outputLocation, title, clientName, script, properties }) {
  const font = fontFile();
  const textFiles = [];
  const text = async (name, value) => {
    const file = await makeTextFile(videoId, name, value);
    textFiles.push(file);
    return quoteFilterValue(file);
  };

  const propertyLines = properties.slice(0, 3);
  while (propertyLines.length < 3) {
    propertyLines.push({ title: "Property recommendation", area: null, city: null, price_label: null, headline: "A strong match for the brief.", highlights: [] });
  }

  const draw = ({ file, size, color = "black", x, y, enable }) => {
    const options = [
      font ? `fontfile=${quoteFilterValue(font)}` : null,
      `textfile=${file}`,
      `fontcolor=${color}`,
      `fontsize=${size}`,
      `x=${x}`,
      `y=${y}`,
      "line_spacing=12",
      `enable=${quoteFilterValue(enable)}`,
    ].filter(Boolean);
    return `drawtext=${options.join(":")}`;
  };
  const box = ({ x, y, w, h, color = "white@0.82", enable }) =>
    `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=${color}:t=fill:enable=${quoteFilterValue(enable)}`;

  const filters = [
    "drawbox=x=38:y=38:w=644:h=1204:color=white@0.78:t=fill",
    await draw({ file: await text("brand", "PROPSHORTS"), size: 24, color: "0x555555", x: 72, y: 74, enable: "between(t,0,15)" }),
    await draw({ file: await text("intro", `Hi ${fit(clientName, 28)}.`), size: 38, color: "0x555555", x: 72, y: 186, enable: "between(t,0,3)" }),
    await draw({ file: await text("title", fit(title, 48)), size: 58, x: 72, y: 250, enable: "between(t,0,3)" }),
    await draw({ file: await text("intro_subtitle", "I found three properties that match your brief."), size: 28, color: "0x555555", x: 72, y: 420, enable: "between(t,0,3)" }),
  ];

  for (let index = 0; index < 3; index += 1) {
    const property = propertyLines[index];
    const start = 3 + index * 3;
    const end = start + 3;
    const details = compact([property.area, property.city, property.price_label]).join(" - ") || "Details available in the PDF report";
    const highlights = Array.isArray(property.highlights) ? property.highlights.slice(0, 3).join("  |  ") : "";
    filters.push(
      box({ x: 70, y: 220, w: 580, h: 610, enable: `between(t,${start},${end})` }),
      await draw({ file: await text(`p${index + 1}_label`, `PROPERTY ${index + 1}`), size: 22, color: "0x8e64d9", x: 104, y: 260, enable: `between(t,${start},${end})` }),
      await draw({ file: await text(`p${index + 1}_title`, fit(property.title || `Property ${index + 1}`, 42)), size: 48, x: 104, y: 330, enable: `between(t,${start},${end})` }),
      await draw({ file: await text(`p${index + 1}_details`, fit(details, 54)), size: 25, color: "0x555555", x: 104, y: 450, enable: `between(t,${start},${end})` }),
      await draw({ file: await text(`p${index + 1}_headline`, fit(property.headline || property.description || "A strong match for the brief.", 64)), size: 31, x: 104, y: 535, enable: `between(t,${start},${end})` }),
      await draw({ file: await text(`p${index + 1}_highlights`, fit(highlights || "See full report for complete details.", 70)), size: 22, color: "0x555555", x: 104, y: 690, enable: `between(t,${start},${end})` }),
    );
  }

  filters.push(
    await draw({ file: await text("outro", "PDF report is ready."), size: 54, x: 72, y: 380, enable: "between(t,12,15)" }),
    await draw({ file: await text("script", fit(script || "Let me know which one stands out and I will take care of the next steps.", 82)), size: 26, color: "0x555555", x: 72, y: 480, enable: "between(t,12,15)" }),
    "drawbox=x=72:y=1160:w=576:h=18:color=black@0.12:t=fill",
    "drawbox=x=72:y=1160:w=576:h=18:color=0x2da7df@0.82:t=fill",
  );

  try {
    const args = [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=0xf6f6f3:s=720x1280:d=15:r=24",
      "-vf",
      filters.join(","),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "24",
      "-movflags",
      "+faststart",
      outputLocation,
    ];
    console.log(`Starting FFmpeg render for video ${videoId}`);
    await runFfmpeg(args, videoId);
  } finally {
    await Promise.all(textFiles.map((file) => rm(file, { force: true })));
  }
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

  try {
    await renderVideoWithFfmpeg({
      videoId,
      outputLocation,
      title: `PropShort for ${clientName}`,
      clientName,
      script: video.script || "",
      properties: propertiesFromInput(input),
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
    await rm(outputLocation, { force: true });
  }
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

    console.log(`Received render request for video ${videoId}`);
    const videoUrl = await renderVideo(videoId, accessToken);
    json(res, 200, {
      success: true,
      video_id: videoId,
      status: "completed",
      video_url: videoUrl,
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
