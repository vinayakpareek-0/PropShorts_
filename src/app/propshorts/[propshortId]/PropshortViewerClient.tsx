"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import {
  briefFromRequirement,
  fetchPackageByVideoId,
  type GeneratedPackageRow,
  refCode,
  shortDate,
} from "@/lib/propshorts/clientData";

interface PropshortViewerClientProps {
  propshortId: string;
}

function propertyCount(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return 0;
  const properties = (input as { properties?: unknown }).properties;
  return Array.isArray(properties) ? properties.length : 0;
}

export default function PropshortViewerClient({ propshortId }: PropshortViewerClientProps) {
  const [pkg, setPkg] = useState<GeneratedPackageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  const clientName = pkg?.client_requirements?.client_name || "Client";
  const title = pkg?.package_title || `PropShort for ${clientName}`;
  const previewUrl = video?.video_url || "";

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
              <div className="flex aspect-video min-h-[360px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#d489ff] via-[#8ecae6] to-[#c8cc7c]">
                {previewUrl ? (
                  // The MVP Edge Function generates a visual Remotion-plan preview poster.
                  <img src={previewUrl} alt={title} className="h-full w-full object-cover" />
                ) : (
                  <div className="px-8 text-center">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-black text-white shadow-sm">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-10 w-10">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <p className="mt-5 text-[15px] text-black/70">Video plan generated. No preview URL saved.</p>
                  </div>
                )}
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/40">
                    Generated artifact
                  </p>
                  <h2 className="mt-2 text-[24px] font-semibold text-white">{title}</h2>
                  <p className="mt-1 text-[14px] text-white/55">
                    {propertyCount(video?.input_json)} properties · Remotion plan ready
                  </p>
                </div>
                <p className="text-[13px] text-white/45">{video?.status || "generated"}</p>
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
