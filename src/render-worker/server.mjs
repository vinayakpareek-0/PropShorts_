import { createServer } from "node:http";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";
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

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(value, maxChars = 28, maxLines = 4) {
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = fit(lines[maxLines - 1], Math.max(8, maxChars - 1));
  }
  return lines.length > 0 ? lines : [""];
}

function textBlock(lines, { x, y, size, weight = 500, color = "#080808", lineHeight = 1.22, letterSpacing = 0 }) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * size * lineHeight}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}">${escapeXml(line)}</text>`
  )).join("");
}

function baseSvg(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="720" height="1280" viewBox="0 0 720 1280" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#d489ff"/>
      <stop offset="0.54" stop-color="#8ecae6"/>
      <stop offset="1" stop-color="#c8cc7c"/>
    </linearGradient>
  </defs>
  <rect width="720" height="1280" fill="url(#bg)"/>
  <rect x="38" y="38" width="644" height="1204" rx="44" fill="rgba(255,255,255,0.78)"/>
  <circle cx="96" cy="92" r="24" fill="#080808"/>
  <text x="136" y="102" fill="#555" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" letter-spacing="6">PROPSHORTS</text>
  ${content}
  <rect x="72" y="1160" width="576" height="18" rx="9" fill="rgba(0,0,0,0.12)"/>
  <rect x="72" y="1160" width="576" height="18" rx="9" fill="#2da7df" opacity="0.82"/>
</svg>`;
}

function introSlide(title, clientName) {
  return baseSvg(`
    ${textBlock([`Hi ${fit(clientName, 28)}.`], { x: 72, y: 228, size: 38, weight: 700, color: "#555" })}
    ${textBlock(wrapText(fit(title, 64), 18, 4), { x: 72, y: 322, size: 62, weight: 900, lineHeight: 1.02 })}
    ${textBlock(["I found three properties that", "match your brief."], { x: 72, y: 610, size: 30, color: "#555", lineHeight: 1.26 })}
  `);
}

function propertySlide(property, index) {
  const details = compact([property.area, property.city, property.price_label]).join(" - ") || "Details available in the PDF report";
  const highlights = Array.isArray(property.highlights) ? property.highlights.slice(0, 3).join("  |  ") : "";
  return baseSvg(`
    <rect x="70" y="210" width="580" height="650" rx="34" fill="rgba(255,255,255,0.88)"/>
    <text x="104" y="270" fill="#8e64d9" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" letter-spacing="5">PROPERTY ${index + 1}</text>
    ${textBlock(wrapText(property.title || `Property ${index + 1}`, 18, 3), { x: 104, y: 360, size: 48, weight: 900, lineHeight: 1.03 })}
    ${textBlock(wrapText(details, 36, 2), { x: 104, y: 512, size: 25, color: "#555", lineHeight: 1.24 })}
    ${textBlock(wrapText(property.headline || property.description || "A strong match for the brief.", 25, 4), { x: 104, y: 630, size: 32, weight: 750, lineHeight: 1.16 })}
    ${textBlock(wrapText(highlights || "See full report for complete details.", 38, 2), { x: 104, y: 798, size: 22, color: "#555", lineHeight: 1.22 })}
  `);
}

function outroSlide(script) {
  return baseSvg(`
    ${textBlock(["PDF report", "is ready."], { x: 72, y: 390, size: 58, weight: 900, lineHeight: 1.04 })}
    ${textBlock(wrapText(script || "Let me know which one stands out and I will take care of the next steps.", 34, 4), { x: 72, y: 570, size: 27, color: "#555", lineHeight: 1.28 })}
  `);
}

async function writeSlide(videoId, index, svg) {
  const filePath = path.join(tmpdir(), `propshort-${videoId}-slide-${index}.png`);
  await sharp(Buffer.from(svg)).png().toFile(filePath);
  return filePath;
}

function concatFilePath(value) {
  return String(value).replace(/'/g, "'\\''");
}

async function renderVideoWithFfmpeg({ videoId, outputLocation, title, clientName, script, properties }) {
  const propertyLines = properties.slice(0, 3);
  while (propertyLines.length < 3) {
    propertyLines.push({
      title: "Property recommendation",
      area: null,
      city: null,
      price_label: null,
      headline: "A strong match for the brief.",
      highlights: [],
    });
  }

  const slideFiles = [
    await writeSlide(videoId, 0, introSlide(title, clientName)),
    await writeSlide(videoId, 1, propertySlide(propertyLines[0], 0)),
    await writeSlide(videoId, 2, propertySlide(propertyLines[1], 1)),
    await writeSlide(videoId, 3, propertySlide(propertyLines[2], 2)),
    await writeSlide(videoId, 4, outroSlide(script)),
  ];
  const concatPath = path.join(tmpdir(), `propshort-${videoId}-concat.txt`);
  const concatBody = slideFiles
    .map((file) => `file '${concatFilePath(file)}'\nduration 3`)
    .join("\n")
    .concat(`\nfile '${concatFilePath(slideFiles[slideFiles.length - 1])}'\n`);

  try {
    await writeFile(concatPath, concatBody, "utf8");
    const args = [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatPath,
      "-vf",
      "format=yuv420p,scale=720:1280",
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
    await Promise.all([...slideFiles, concatPath].map((file) => rm(file, { force: true })));
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
