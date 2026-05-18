"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import {
  briefFromRequirement,
  copyText,
  fetchPackageByVideoId,
  publicShareUrl,
  refCode,
  shortDate,
  type GeneratedPackageRow,
} from "@/lib/propshorts/clientData";
import { supabase } from "@/lib/supabase/client";

interface PropshortViewerClientProps {
  propshortId: string;
}

function propertyCount(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return 0;
  const properties = (input as { properties?: unknown }).properties;
  return Array.isArray(properties) ? properties.length : 0;
}

function previewProperties(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return [];
  const properties = (input as { properties?: unknown }).properties;
  if (!Array.isArray(properties)) return [];

  return properties.slice(0, 5).map((property, index) => {
    const record = property && typeof property === "object" ? (property as Record<string, unknown>) : {};
    return {
      id: typeof record.id === "string" ? record.id : `property-${index}`,
      title: typeof record.title === "string" ? record.title : `Property ${index + 1}`,
      area: [record.area, record.city].filter((value): value is string => typeof value === "string" && value.length > 0).join(", "),
      price: typeof record.price_label === "string" ? record.price_label : "",
    };
  });
}

function isStaleProcessing(updatedAt?: string | null) {
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() > 8 * 60 * 1000;
}

export default function PropshortViewerClient({ propshortId }: PropshortViewerClientProps) {
  const [pkg, setPkg] = useState<GeneratedPackageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);
  const [renderingAgain, setRenderingAgain] = useState(false);
  const [renderMessage, setRenderMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadVideo() {
      try {
        const row = await fetchPackageByVideoId(propshortId);
        if (!cancelled) {
          if (!row) setError("Could not find this generated PropShort.");
          setPkg(row);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load this PropShort.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVideo();

    return () => {
      cancelled = true;
    };
  }, [propshortId]);

  const video = pkg?.generated_videos;
  const shouldPollRender = video?.status === "processing";

  useEffect(() => {
    if (!shouldPollRender) return;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const row = await fetchPackageByVideoId(propshortId);
        if (!cancelled) setPkg(row);
      } catch (pollError) {
        console.warn(pollError);
      }
    }, 6000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [propshortId, shouldPollRender]);

  const clientName = pkg?.client_requirements?.client_name || "Client";
  const title = pkg?.package_title || `PropShort for ${clientName}`;
  const properties = previewProperties(video?.input_json);
  const hasRenderedVideo = Boolean(video?.video_url && video.video_url.endsWith(".mp4"));
  const staleProcessing = video?.status === "processing" && isStaleProcessing(video.updated_at);
  const artifactStatus = hasRenderedVideo
    ? "MP4 rendered"
    : video?.status === "failed"
      ? "Render failed"
      : staleProcessing
        ? "Render timed out"
        : "Rendering MP4";

  async function handleShare() {
    if (!pkg?.share_slug) return;

    await copyText(publicShareUrl(pkg.share_slug));
    setShared(true);
    setTimeout(() => setShared(false), 2200);
  }

  async function handleRenderAgain() {
    if (!video?.id || renderingAgain) return;

    setRenderingAgain(true);
    setRenderMessage("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("rerender-property-video", {
        body: { video_id: video.id },
      });

      if (invokeError) throw invokeError;
      if (data && typeof data === "object" && "success" in data && !data.success) {
        const message = data.error && typeof data.error === "object" && "message" in data.error
          ? String(data.error.message)
          : "Could not start the render.";
        throw new Error(message);
      }

      setRenderMessage("Render started. This page will show the video when it finishes.");
      const row = await fetchPackageByVideoId(propshortId);
      setPkg(row);
    } catch (rerenderError) {
      setRenderMessage(rerenderError instanceof Error ? rerenderError.message : "Could not start the render.");
    } finally {
      setRenderingAgain(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-5 rounded-3xl bg-white p-8 ring-1 ring-black/[0.06] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/propshorts" className="text-[13px] font-medium uppercase tracking-[0.24em] text-black/35 hover:text-black">
              My PropShorts
            </Link>
            <h1 className="mt-3 text-[40px] font-light leading-none tracking-[-0.02em] text-black sm:text-[56px]">
              PropShort Preview.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-6 text-black/50">
              {loading ? "Loading generated PropShort..." : error || briefFromRequirement(pkg?.client_requirements ?? null)}
            </p>
          </div>
          <div className="rounded-2xl bg-[#f5f5f5] px-5 py-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/35">Video ID</p>
            <p className="mt-1 text-[16px] font-semibold text-black">{propshortId.slice(0, 8).toUpperCase()}</p>
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl bg-[#f5f5f5] py-20 text-center text-black/45">Loading PropShort...</div>
        ) : error ? (
          <div className="rounded-3xl bg-red-50 py-20 text-center text-red-600">{error}</div>
        ) : pkg ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <section className="rounded-3xl bg-black p-5 text-white">
              {hasRenderedVideo ? (
                <video
                  className="aspect-[9/16] max-h-[720px] w-full rounded-2xl bg-black object-contain"
                  src={video?.video_url || ""}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
              <div className="relative flex aspect-video min-h-[360px] overflow-hidden rounded-2xl bg-gradient-to-br from-[#d489ff] via-[#8ecae6] to-[#c8cc7c] p-8 text-black">
                <div className="absolute inset-4 rounded-[20px] bg-white/70" />
                <div className="relative z-10 flex w-full flex-col justify-between">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-[0.32em] text-black/45">PropShorts</p>
                    <h3 className="mt-5 max-w-2xl text-[36px] font-black leading-tight tracking-[-0.02em]">
                      {title}
                    </h3>
                    <p className="mt-2 text-[16px] font-medium text-black/55">Generated Remotion plan preview</p>
                  </div>

                  <div className="grid gap-3">
                    {properties.length > 0 ? (
                      properties.map((property, index) => (
                        <div key={property.id} className="rounded-2xl bg-white/70 px-4 py-3 shadow-sm">
                          <p className="text-[15px] font-bold text-black">{index + 1}. {property.title}</p>
                          <p className="mt-0.5 text-[12px] text-black/55">
                            {[property.area, property.price].filter(Boolean).join(" · ") || "Property recommendation"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-white/70 px-4 py-3 text-[14px] font-medium text-black/55">
                        Video plan saved. Property scene data is unavailable.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white shadow-sm">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-7 w-7">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-black/45">Ready to render</p>
                  </div>
                </div>
              </div>
              )}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/40">
                    Generated artifact
                  </p>
                  <h2 className="mt-2 text-[24px] font-semibold text-white">{title}</h2>
                  <p className="mt-1 text-[14px] text-white/55">
                    {propertyCount(video?.input_json)} properties · {artifactStatus}
                  </p>
                  {video?.status === "failed" ? (
                    <p className="mt-2 text-[13px] text-red-200">
                      {video.error_message || "The render worker could not finish this video."}
                    </p>
                  ) : null}
                  {staleProcessing ? (
                    <p className="mt-2 text-[13px] text-amber-100">
                      This render has been processing for too long. Start it again to use the lighter renderer.
                    </p>
                  ) : null}
                </div>
                <p className="text-[13px] text-white/45">{video?.status || "generated"}</p>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleRenderAgain}
                  disabled={!video?.id || renderingAgain || (video?.status === "processing" && !staleProcessing)}
                  className="rounded-xl bg-white px-5 py-3 text-[14px] font-semibold text-black transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {renderingAgain ? "Starting Render..." : video?.status === "processing" && !staleProcessing ? "Rendering..." : "Render Again"}
                </button>
                {renderMessage ? (
                  <p className="text-[13px] text-white/55">{renderMessage}</p>
                ) : null}
              </div>
            </section>

            <aside className="flex flex-col gap-4">
              <div className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">
                  Package
                </p>
                <h2 className="mt-3 text-[22px] font-semibold leading-tight text-black">{clientName}</h2>
                <p className="mt-2 text-[14px] leading-6 text-black/45">{title}</p>
                <p className="mt-4 text-[12px] font-medium uppercase tracking-wide text-black/35">
                  REF {refCode(pkg.id)} · {shortDate(pkg.created_at)}
                </p>
                <div className="mt-5 grid gap-3">
                  {pkg.pdf_id ? (
                    <Link
                      href={`/pdfs/${pkg.pdf_id}`}
                      className="rounded-xl bg-black px-5 py-3 text-center text-[14px] font-semibold text-white"
                    >
                      Open PDF
                    </Link>
                  ) : null}
                  <Link
                    href={`/packages/${pkg.id}`}
                    className="rounded-xl bg-[#f5f5f5] px-5 py-3 text-center text-[14px] font-semibold text-black"
                  >
                    Open Package
                  </Link>
                  {pkg.share_slug ? (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="rounded-xl bg-[#c8cc7c] px-5 py-3 text-center text-[14px] font-semibold text-black"
                    >
                      {shared ? "Public Link Copied" : "Share Public Link"}
                    </button>
                  ) : null}
                </div>
              </div>

              {video?.script ? (
                <div className="rounded-3xl bg-[#f5f5f5] p-6">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">
                    Voiceover
                  </p>
                  <p className="mt-3 max-h-56 overflow-auto text-[13px] leading-6 text-black/55">{video.script}</p>
                </div>
              ) : null}
            </aside>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
