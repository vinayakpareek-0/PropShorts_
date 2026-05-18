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
const renderTimeoutMs = Number(process.env.REMOTION_RENDER_TIMEOUT_MS || 180000);
const imageFetchTimeoutMs = Number(process.env.REMOTION_IMAGE_FETCH_TIMEOUT_MS || 4500);
const maxVideoImagesPerProperty = Number(process.env.REMOTION_IMAGES_PER_PROPERTY || 1);
const fps = 24;
const activeRenders = new Set();
let cachedLogoDataUri = null;

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
          .map((image) => image && typeof image === "object" ? image.url : image)
          .filter((url) => typeof url === "string" && /^https?:\/\//i.test(url))
          .slice(0, Math.max(1, Math.min(3, maxVideoImagesPerProperty)))
        : [],
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

async function getLogoDataUri() {
  if (cachedLogoDataUri !== null) return cachedLogoDataUri;
  try {
    const logoPath = path.join(process.cwd(), "public", "top_logo.png");
    const bytes = await readFile(logoPath);
    cachedLogoDataUri = `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    cachedLogoDataUri = "";
  }
  return cachedLogoDataUri;
}

function metricLabel(property, imageIndex) {
  const metrics = [
    property.bedrooms ? `${property.bedrooms} BED` : null,
    property.size_label || (property.sqft ? `${property.sqft} SQFT` : null),
    property.price_label,
  ].filter(Boolean);

  return metrics[imageIndex] || metrics[0] || "DETAILS IN PDF";
}

function locationLabel(property) {
  return compact([property.area, property.city]).join(", ") || "Location on request";
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
  <rect width="720" height="1280" fill="#f3f3f1"/>
  ${content}
</svg>`;
}

function brandImage(logoDataUri, x, y, width = 118, height = 52) {
  if (logoDataUri) {
    return `<image href="${logoDataUri}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMinYMid meet"/>`;
  }

  return `
    <rect x="${x}" y="${y + 11}" width="26" height="26" rx="2" fill="#080808"/>
    <text x="${x + 40}" y="${y + 31}" fill="#080808" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="900">propshorts</text>
  `;
}

function footerMark(logoDataUri) {
  return `
    <text x="64" y="1204" fill="#111111" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">PS 903</text>
    ${brandImage(logoDataUri, 512, 1174, 112, 50)}
    <rect x="64" y="1234" width="592" height="10" fill="#080808"/>
  `;
}

function agentBlock({ x = 64, y = 62, compact = false, logoDataUri = "" } = {}) {
  const brandWidth = compact ? 102 : 118;
  const nameSize = compact ? 17 : 19;
  const lineGap = compact ? 18 : 20;
  const textX = x + brandWidth + 16;
  return `
    ${brandImage(logoDataUri, x, y - 2, brandWidth, compact ? 45 : 52)}
    <text x="${textX}" y="${y + 18}" fill="#080808" font-family="Arial, Helvetica, sans-serif" font-size="${nameSize}" font-weight="700">PropShorts Broker</text>
    <text x="${textX}" y="${y + 18 + lineGap}" fill="#222222" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 14 : 16}" font-weight="500">PropShorts Real Estate</text>
    <text x="${textX}" y="${y + 18 + lineGap * 2}" fill="#222222" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 14 : 16}" font-weight="500">Contact via broker</text>
  `;
}

function introGreetingSlide(clientName, logoDataUri) {
  return baseSvg(`
    <rect x="64" y="88" width="592" height="1040" fill="#ffffff"/>
    ${brandImage(logoDataUri, 154, 192, 132, 58)}
    ${textBlock(["Hi"], { x: 154, y: 518, size: 148, weight: 900, lineHeight: 0.9 })}
    ${textBlock([`${fit(clientName, 20)}.`], { x: 160, y: 612, size: 44, weight: 700, lineHeight: 1 })}
    ${footerMark(logoDataUri)}
  `);
}

function introContextSlide(logoDataUri) {
  return baseSvg(`
    <rect x="64" y="88" width="592" height="1040" fill="#ffffff"/>
    ${textBlock(["Check", "Out", "These", "Properties!"], { x: 160, y: 360, size: 58, weight: 900, lineHeight: 0.94 })}
    ${agentBlock({ x: 160, y: 690, logoDataUri })}
    ${footerMark(logoDataUri)}
  `);
}

function propertyNumberSlide(index, logoDataUri) {
  return baseSvg(`
    <rect x="64" y="88" width="592" height="1040" fill="#ffffff"/>
    ${brandImage(logoDataUri, 96, 132, 118, 52)}
    <circle cx="360" cy="610" r="112" fill="#080808"/>
    <text x="360" y="655" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="128" font-weight="900">${index + 1}</text>
    ${footerMark(logoDataUri)}
  `);
}

function imagePanel(imageDataUri) {
  if (!imageDataUri) {
    return `
      <rect x="64" y="210" width="592" height="548" fill="url(#bg)"/>
      <rect x="64" y="210" width="592" height="548" fill="rgba(255,255,255,0.22)"/>
    `;
  }

  return `
    <clipPath id="photoClip"><rect x="64" y="210" width="592" height="548"/></clipPath>
    <image href="${imageDataUri}" x="64" y="210" width="592" height="548" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>
  `;
}

function propertyImageSlide(property, index, imageIndex, imageDataUri, logoDataUri) {
  const label = `Property ${index + 1}`;
  const badge = metricLabel(property, imageIndex);
  const location = locationLabel(property);
  return baseSvg(`
    <rect x="64" y="88" width="592" height="1040" fill="#ffffff"/>
    ${agentBlock({ x: 96, y: 122, compact: true, logoDataUri })}
    ${imagePanel(imageDataUri)}
    <rect x="96" y="708" width="${Math.max(112, badge.length * 12)}" height="44" fill="#ffffff"/>
    <text x="116" y="736" fill="#080808" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900">${escapeXml(badge)}</text>
    <text x="96" y="824" fill="#080808" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="500">${escapeXml(label)}</text>
    <text x="96" y="860" fill="#080808" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="900">${escapeXml(fit(location, 26))}</text>
    <line x1="96" y1="894" x2="540" y2="894" stroke="#111111" stroke-width="1"/>
    ${textBlock(wrapText(property.headline || property.description || "A strong match for the brief.", 18, 3), { x: 96, y: 956, size: 40, weight: 850, lineHeight: 1.04 })}
    ${footerMark(logoDataUri)}
  `);
}

function outroSlide(logoDataUri) {
  return baseSvg(`
    <rect x="64" y="88" width="592" height="1040" fill="#ffffff"/>
    ${brandImage(logoDataUri, 168, 206, 132, 58)}
    <rect x="168" y="392" width="230" height="90" rx="10" fill="#080808"/>
    <text x="283" y="455" text-anchor="middle" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="900">PDF</text>
    ${textBlock(["Check out the PDF", "for the full property", "details!"], { x: 168, y: 560, size: 30, weight: 800, lineHeight: 1.04 })}
    ${footerMark(logoDataUri)}
  `);
}

function closingSlide(script, logoDataUri) {
  return baseSvg(`
    <rect x="64" y="88" width="592" height="1040" fill="#ffffff"/>
    ${textBlock(["Call", "me."], { x: 168, y: 390, size: 90, weight: 900, lineHeight: 0.86 })}
    ${agentBlock({ x: 168, y: 680, logoDataUri })}
    ${textBlock(wrapText(script || "Let me know which one stands out and I will take care of the next steps for you.", 28, 4), { x: 168, y: 850, size: 25, color: "#333333", lineHeight: 1.22 })}
    ${footerMark(logoDataUri)}
  `);
}

async function writeSlide(videoId, index, svg) {
  const filePath = path.join(tmpdir(), `propshort-${videoId}-slide-${index}.png`);
  await sharp(Buffer.from(svg)).png().toFile(filePath);
  return filePath;
}

async function imageDataUri(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), imageFetchTimeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "image/jpeg,image/png,image/webp,image/*",
        "User-Agent": "Mozilla/5.0 PropShorts/1.0 (+https://propshorts.netlify.app)",
      },
    });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const jpeg = await sharp(buffer)
      .rotate()
      .resize(760, 760, { fit: "cover", position: "attention", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();

    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch (error) {
    console.warn(`Could not load property image ${url}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function preloadPropertyImages(properties) {
  const urls = [
    ...new Set(
      properties.flatMap((property) => Array.isArray(property.images) ? property.images.slice(0, Math.max(1, Math.min(3, maxVideoImagesPerProperty))) : [])
        .filter((url) => typeof url === "string" && /^https?:\/\//i.test(url)),
    ),
  ];
  const imageMap = new Map();

  for (const url of urls) {
    imageMap.set(url, await imageDataUri(url));
  }

  return imageMap;
}

function concatFilePath(value) {
  return String(value).replace(/'/g, "'\\''");
}

async function renderVideoWithFfmpeg({ videoId, outputLocation, clientName, script, properties }) {
  const propertyLines = properties.slice(0, 5);
  while (propertyLines.length < 1) {
    propertyLines.push({
      title: "Property recommendation",
      area: null,
      city: null,
      price_label: null,
      bedrooms: null,
      sqft: null,
      size_label: null,
      headline: "A strong match for the brief.",
      highlights: [],
      images: [],
    });
  }

  const logoDataUri = await getLogoDataUri();
  const imageMap = await preloadPropertyImages(propertyLines);
  const slides = [
    { duration: 4, svg: introGreetingSlide(clientName, logoDataUri) },
    { duration: 6, svg: introContextSlide(logoDataUri) },
  ];

  for (const [propertyIndex, property] of propertyLines.entries()) {
    slides.push({ duration: 1, svg: propertyNumberSlide(propertyIndex, logoDataUri) });
    for (let imageIndex = 0; imageIndex < 3; imageIndex += 1) {
      const imageUrl = property.images[Math.min(imageIndex, property.images.length - 1)] || property.images[0] || null;
      const image = imageUrl ? imageMap.get(imageUrl) || null : null;
      slides.push({ duration: 7 / 3, svg: propertyImageSlide(property, propertyIndex, imageIndex, image, logoDataUri) });
    }
  }

  slides.push({ duration: 4, svg: outroSlide(logoDataUri) });
  slides.push({ duration: 6, svg: closingSlide(script, logoDataUri) });

  const slideFiles = [];
  for (const [index, slide] of slides.entries()) {
    slideFiles.push(await writeSlide(videoId, index, slide.svg));
  }
  const concatPath = path.join(tmpdir(), `propshort-${videoId}-concat.txt`);
  const concatBody = slideFiles
    .map((file, index) => `file '${concatFilePath(file)}'\nduration ${slides[index].duration}`)
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
      String(fps),
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

function startRenderJob(videoId, accessToken) {
  if (activeRenders.has(videoId)) return false;

  activeRenders.add(videoId);
  setImmediate(() => {
    renderVideo(videoId, accessToken)
      .then((videoUrl) => {
        console.log(`Render job completed for video ${videoId}: ${videoUrl}`);
      })
      .catch((error) => {
        console.error(`Render job failed for video ${videoId}: ${error instanceof Error ? error.message : String(error)}`);
      })
      .finally(() => {
        activeRenders.delete(videoId);
      });
  });

  return true;
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

    const started = startRenderJob(videoId, accessToken);
    console.log(`${started ? "Queued" : "Skipped duplicate"} render request for video ${videoId}`);
    json(res, 202, {
      success: true,
      video_id: videoId,
      status: started ? "processing" : "already_processing",
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
