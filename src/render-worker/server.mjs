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
const maxVideoImagesPerProperty = Number(process.env.REMOTION_IMAGES_PER_PROPERTY || 3);
const cartesiaApiKey = process.env.CARTESIA_API_KEY || "";
const cartesiaVoiceId = process.env.CARTESIA_VOICE_ID || "694f9389-aac1-45b6-b726-9d9369183238";
const fps = 24;
const activeRenders = new Set();
let cachedLogoDataUri = null;

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

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

function fitBadgeText(value, max = 16) {
  return fit(String(value || ""), max).toUpperCase();
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

function brokerLine(profile) {
  return `${profile.fullName} @`;
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

function textBlock(lines, { x, y, size, weight = 500, color = "#080808", lineHeight = 1.22, letterSpacing = 0, anchor = "start" }) {
  return lines.map((line, index) => (
    `<text x="${x}" y="${y + index * size * lineHeight}" text-anchor="${anchor}" fill="${color}" font-family="Poppins, Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}">${escapeXml(line)}</text>`
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
  <rect width="720" height="1280" fill="#ffffff"/>
  ${content}
</svg>`;
}

function brandImage(logoDataUri, x, y, width = 118, height = 52) {
  if (logoDataUri) {
    return `<image href="${logoDataUri}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMinYMid meet"/>`;
  }

  return `
    <rect x="${x}" y="${y + 11}" width="26" height="26" rx="2" fill="#080808"/>
    <text x="${x + 40}" y="${y + 31}" fill="#080808" font-family="Poppins, Arial, Helvetica, sans-serif" font-size="20" font-weight="900">propshorts</text>
  `;
}

function footerMark(logoDataUri) {
  return `
    <text x="64" y="1210" fill="#111111" font-family="Poppins, Arial, Helvetica, sans-serif" font-size="22" font-weight="700">PS 903</text>
    ${brandImage(logoDataUri, 512, 1174, 112, 50)}
  `;
}

function brokerAvatar({ x, y, size, photoDataUri }) {
  if (photoDataUri) {
    return `
      <clipPath id="brokerAvatar${x}${y}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="5"/></clipPath>
      <image href="${photoDataUri}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#brokerAvatar${x}${y})"/>
    `;
  }

  return `
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="5" fill="#075c31"/>
    <path d="M${x + size * 0.48} ${y + size * 0.22} L${x + size * 0.28} ${y + size * 0.64} L${x + size * 0.68} ${y + size * 0.64} Z" fill="none" stroke="#d6a753" stroke-width="${size * 0.06}" stroke-linejoin="round"/>
    <path d="M${x + size * 0.42} ${y + size * 0.42} L${x + size * 0.62} ${y + size * 0.54}" stroke="#d6a753" stroke-width="${size * 0.05}" stroke-linecap="round"/>
    <path d="M${x + size * 0.38} ${y + size * 0.54} L${x + size * 0.62} ${y + size * 0.64}" stroke="#d6a753" stroke-width="${size * 0.05}" stroke-linecap="round"/>
    <path d="M${x + size * 0.49} ${y + size * 0.64} L${x + size * 0.49} ${y + size * 0.80}" stroke="#d6a753" stroke-width="${size * 0.06}" stroke-linecap="round"/>
    <path d="M${x + size * 0.39} ${y + size * 0.82} L${x + size * 0.59} ${y + size * 0.82}" stroke="#d6a753" stroke-width="${size * 0.06}" stroke-linecap="round"/>
  `;
}

function agentBlock({ x = 64, y = 62, compact = false, broker, brokerPhotoDataUri = "" } = {}) {
  const avatarSize = compact ? 126 : 112;
  const nameSize = compact ? 34 : 31;
  const detailSize = compact ? 31 : 28;
  const phoneSize = compact ? 27 : 24;
  const lineGap = compact ? 34 : 31;
  const textX = x + avatarSize + 30;
  const blockWidth = compact ? 600 : 500;
  const blockHeight = compact ? 148 : 128;
  return `
    <rect x="${x - 18}" y="${y - 18}" width="${blockWidth}" height="${blockHeight}" rx="10" fill="#f3f3f1"/>
    ${brokerAvatar({ x, y, size: avatarSize, photoDataUri: brokerPhotoDataUri })}
    <text x="${textX}" y="${y + 36}" fill="#080808" font-family="Poppins, Arial, Helvetica, sans-serif" font-size="${nameSize}" font-weight="800">${escapeXml(fit(brokerLine(broker), compact ? 19 : 24))}</text>
    <text x="${textX}" y="${y + 36 + lineGap}" fill="#080808" font-family="Poppins, Arial, Helvetica, sans-serif" font-size="${detailSize}" font-weight="700">${escapeXml(fit(broker.companyName, compact ? 21 : 28))}</text>
    <text x="${textX}" y="${y + 36 + lineGap * 2}" fill="#080808" font-family="Poppins, Arial, Helvetica, sans-serif" font-size="${phoneSize}" font-weight="600">${escapeXml(fit(broker.phone, compact ? 18 : 24))}</text>
  `;
}

function introContextSlide(logoDataUri, broker, brokerPhotoDataUri) {
  return baseSvg(`
    ${textBlock(["Check", "Out", "These", "Properties!"], { x: 116, y: 410, size: 74, weight: 800, lineHeight: 0.96 })}
    ${agentBlock({ x: 116, y: 860, broker, brokerPhotoDataUri })}
    ${footerMark(logoDataUri)}
  `);
}

function propertyNumberSlide(index, logoDataUri) {
  return baseSvg(`
    <circle cx="360" cy="610" r="150" fill="#080808"/>
    <text x="360" y="670" text-anchor="middle" fill="#ffffff" font-family="Poppins, Arial, Helvetica, sans-serif" font-size="172" font-weight="800">${index + 1}</text>
    ${footerMark(logoDataUri)}
  `);
}

function imagePanel(imageDataUri) {
  if (!imageDataUri) {
    return `
      <rect x="0" y="260" width="720" height="570" fill="url(#bg)"/>
      <rect x="0" y="260" width="720" height="570" fill="rgba(255,255,255,0.22)"/>
    `;
  }

  return `
    <clipPath id="photoClip"><rect x="0" y="260" width="720" height="570"/></clipPath>
    <image href="${imageDataUri}" x="0" y="260" width="720" height="570" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>
  `;
}

function propertyOrdinal(index) {
  return ["One", "Two", "Three", "Four", "Five"][index] || String(index + 1);
}

function propertyImageSlide(property, index, imageIndex, imageDataUri, logoDataUri, broker, brokerPhotoDataUri) {
  const label = `Property ${propertyOrdinal(index)}`;
  const badge = fitBadgeText(metricLabel(property, imageIndex));
  const location = property.area || property.city || locationLabel(property);
  const headlineLines = wrapText(property.headline || property.description || "A strong match for the brief.", 21, 3);
  const badgeWidth = Math.max(150, Math.min(340, badge.length * 14 + 52));
  const badgeSize = badge.length > 14 ? 23 : badge.length > 11 ? 26 : 31;
  return baseSvg(`
    ${agentBlock({ x: 58, y: 88, compact: true, broker, brokerPhotoDataUri })}
    ${imagePanel(imageDataUri)}
    <rect x="64" y="750" width="${badgeWidth}" height="64" fill="#ffffff"/>
    <text x="88" y="793" fill="#080808" font-family="Poppins, Arial, Helvetica, sans-serif" font-size="${badgeSize}" font-weight="700">${escapeXml(badge)}</text>
    <text x="64" y="900" fill="#080808" font-family="Poppins, Arial, Helvetica, sans-serif" font-size="28" font-weight="500">${escapeXml(label)}</text>
    <text x="64" y="944" fill="#080808" font-family="Poppins, Arial, Helvetica, sans-serif" font-size="40" font-weight="800">${escapeXml(fit(location, 22))}</text>
    <line x1="64" y1="995" x2="555" y2="995" stroke="#111111" stroke-width="1.5"/>
    ${textBlock(headlineLines, { x: 64, y: 1058, size: 48, weight: 500, lineHeight: 1.02 })}
    ${footerMark(logoDataUri)}
  `);
}

function outroSlide(logoDataUri) {
  return baseSvg(`
    <rect x="110" y="430" width="500" height="138" rx="13" fill="#080808"/>
    <text x="360" y="529" text-anchor="middle" fill="#ffffff" font-family="Poppins, Arial, Helvetica, sans-serif" font-size="92" font-weight="500">PDF</text>
    ${textBlock(["Check out the PDF", "for the full property", "details!"], { x: 360, y: 660, size: 38, weight: 600, lineHeight: 1.08, anchor: "middle" })}
    ${footerMark(logoDataUri)}
  `);
}

function closingSlide(logoDataUri, broker, brokerPhotoDataUri) {
  return baseSvg(`
    ${textBlock(["Call", "me."], { x: 360, y: 395, size: 158, weight: 800, lineHeight: 0.74, anchor: "middle" })}
    ${brokerAvatar({ x: 286, y: 735, size: 148, photoDataUri: brokerPhotoDataUri })}
    ${textBlock([brokerLine(broker), broker.companyName, broker.phone], { x: 360, y: 945, size: 43, weight: 500, lineHeight: 1.12, anchor: "middle" })}
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
    const jpeg = await sharp(buffer, { limitInputPixels: 24000000 })
      .rotate()
      .resize(720, 570, { fit: "cover", position: "attention", withoutEnlargement: true })
      .jpeg({ quality: 68, mozjpeg: true })
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
  const imageEntries = await mapWithConcurrency(urls, 5, async (url) => [url, await imageDataUri(url)]);
  const imageMap = new Map(imageEntries);

  return imageMap;
}

function concatFilePath(value) {
  return String(value).replace(/'/g, "'\\''");
}

async function renderVideoWithFfmpeg({ videoId, outputLocation, broker, properties }) {
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

  const [logoDataUri, brokerPhotoDataUri, imageMap] = await Promise.all([
    getLogoDataUri(),
    broker.photoUrl ? imageDataUri(broker.photoUrl) : "",
    preloadPropertyImages(propertyLines),
  ]);
  const slides = [
    { duration: 4, svg: introContextSlide(logoDataUri, broker, brokerPhotoDataUri) },
  ];

  for (const [propertyIndex, property] of propertyLines.entries()) {
    slides.push({ duration: 1, svg: propertyNumberSlide(propertyIndex, logoDataUri) });
    for (let imageIndex = 0; imageIndex < 3; imageIndex += 1) {
      const imageUrl = property.images[Math.min(imageIndex, property.images.length - 1)] || property.images[0] || null;
      const image = imageUrl ? imageMap.get(imageUrl) || null : null;
      slides.push({ duration: 7 / 3, svg: propertyImageSlide(property, propertyIndex, imageIndex, image, logoDataUri, broker, brokerPhotoDataUri) });
    }
  }

  slides.push({ duration: 4, svg: outroSlide(logoDataUri) });
  slides.push({ duration: 5, svg: closingSlide(logoDataUri, broker, brokerPhotoDataUri) });

  const totalDuration = slides.reduce((sum, slide) => sum + slide.duration, 0);
  const narrationPath = await generateNarrationAudio(videoId, narrationForVideo({ broker, properties: propertyLines }));
  const slideFiles = await mapWithConcurrency(slides, 4, (slide, index) => writeSlide(videoId, index, slide.svg));
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
    ];
    if (narrationPath) {
      args.push("-i", narrationPath);
    }
    args.push(
      "-vf",
      "format=yuv420p,scale=720:1280",
      "-map",
      "0:v:0",
    );
    if (narrationPath) {
      args.push("-map", "1:a:0", "-af", "apad", "-c:a", "aac", "-b:a", "128k");
    }
    args.push(
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-r",
      String(fps),
      "-t",
      String(totalDuration),
      "-movflags",
      "+faststart",
      outputLocation,
    );
    console.log(`Starting FFmpeg render for video ${videoId}`);
    await runFfmpeg(args, videoId);
  } finally {
    await Promise.all([...slideFiles, concatPath, narrationPath].filter(Boolean).map((file) => rm(file, { force: true })));
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
  const broker = brokerProfileFromInput(input);
  const outputLocation = path.join(tmpdir(), `propshort-${videoId}.mp4`);

  try {
    await renderVideoWithFfmpeg({
      videoId,
      outputLocation,
      broker,
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
