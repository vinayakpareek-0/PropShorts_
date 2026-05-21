"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PropShortsLogo from "@/components/PropShortsLogo";
import {
  briefFromRequirement,
  fetchGeneratedPackageByShareSlug,
  fetchPackageProperties,
  refCode,
  shortDate,
  type GeneratedPackageRow,
  type PropertyRecommendationRow,
} from "@/lib/propshorts/clientData";
import { supabase } from "@/lib/supabase/client";

interface SharePageProps {
  params: Promise<{ shareSlug: string }>;
}

function highlights(value: PropertyRecommendationRow["highlights"]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function imageUrls(value: PropertyRecommendationRow["images"]) {
  if (!Array.isArray(value)) return [];
  const urls = value
    .map((item) => {
      const record = item && typeof item === "object" && !Array.isArray(item) ? item as { url?: unknown } : null;
      const url = typeof record?.url === "string" ? record.url.trim() : "";
      return url.startsWith("http") ? url : "";
    })
    .filter(Boolean);

  return Array.from(new Set(urls));
}

function PropertyImage({
  urls,
  alt,
}: {
  urls: string[];
  alt: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeUrl = urls[activeIndex] || "";

  if (!activeUrl) {
    return (
      <div className="flex h-56 items-center justify-center bg-white text-[13px] font-semibold uppercase tracking-[0.18em] text-black/30 sm:h-full">
        Property
      </div>
    );
  }

  return (
    <img
      src={activeUrl}
      alt={alt}
      referrerPolicy="no-referrer"
      className="h-56 w-full bg-white object-cover sm:h-full"
      onError={() => {
        setActiveIndex((current) => current + 1);
      }}
    />
  );
}

function propertyLocation(property: PropertyRecommendationRow) {
  return [property.area, property.city].filter(Boolean).join(", ") || "Location unavailable";
}

function propertySpecs(property: PropertyRecommendationRow) {
  return [
    property.bedrooms ? `${property.bedrooms} bed` : null,
    property.bathrooms ? `${property.bathrooms} bath` : null,
    property.size_label || (property.sqft ? `${property.sqft} sqft` : null),
    property.property_type,
  ].filter(Boolean);
}

function videoProperties(input: unknown) {
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

function ShareSkeleton() {
  return (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
      <p className="text-[13px] font-medium text-black/40">Loading shared package...</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="h-72 rounded-3xl bg-[#f5f5f5]" />
        <div className="h-72 rounded-3xl bg-[#f5f5f5]" />
      </div>
    </div>
  );
}

function EmptyState({ error }: { error?: string }) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-black/[0.06]">
      <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-black/35">Shared package</p>
      <h1 className="mt-3 text-[34px] font-light tracking-[-0.02em] text-black">Unavailable.</h1>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-black/50">
        {error || "This shared package is unavailable or not public."}
      </p>
    </div>
  );
}

function PackageContent({
  pkg,
  properties,
  loading,
  error,
  isLoggedIn,
}: {
  pkg: GeneratedPackageRow | null;
  properties: PropertyRecommendationRow[];
  loading: boolean;
  error: string;
  isLoggedIn: boolean;
}) {
  const clientName = pkg?.client_requirements?.client_name || "Client";
  const brief = useMemo(
    () => briefFromRequirement(pkg?.client_requirements ?? null),
    [pkg],
  );
  const title = pkg?.package_title || `Property recommendations for ${clientName}`;
  const video = pkg?.generated_videos;
  const pdfUrl = pkg?.generated_pdfs?.pdf_url || "";
  const renderedVideo = Boolean(video?.video_url && video.video_url.endsWith(".mp4"));
  const videoPreviewProperties = videoProperties(video?.input_json);

  if (loading) return <ShareSkeleton />;
  if (error || !pkg) return <EmptyState error={error} />;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl bg-[#f5f5f5] p-7 ring-1 ring-black/[0.04] sm:p-9">
          <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-black/35">
            Shared package
          </p>
          <h1 className="mt-5 max-w-4xl text-[42px] font-light leading-[1.02] tracking-[-0.02em] text-black sm:text-[64px]">
            {clientName}.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-black/55">
            {brief}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-black px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-85"
              >
                Open PDF Report
              </a>
            ) : null}
            {video?.video_url ? (
              <a
                href="#propshort-video"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-5 text-[14px] font-semibold text-black ring-1 ring-black/[0.06] transition-opacity hover:opacity-75"
              >
                Watch PropShort
              </a>
            ) : null}
          </div>
        </section>

        <aside className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-black/35">Package details</p>
          <div className="mt-6 space-y-4">
            {[
              ["Reference", refCode(pkg.id)],
              ["Shared", shortDate(pkg.created_at)],
              ["Properties", String(properties.length)],
              ["Video", video ? (renderedVideo ? "Ready" : "Preview") : "Not included"],
              ["PDF", pdfUrl ? "Ready" : "Not included"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-5 border-b border-black/[0.06] pb-4 last:border-b-0 last:pb-0">
                <p className="text-[13px] text-black/40">{label}</p>
                <p className="text-right text-[14px] font-semibold text-black">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl bg-[#c8cc7c] p-5">
            <p className="text-[13px] font-semibold text-black">Prepared with PropShorts</p>
            <p className="mt-2 text-[13px] leading-5 text-black/60">
              A broker-ready shortlist with property context, report output, and a video package in one place.
            </p>
          </div>
        </aside>
      </header>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-black/35">Shortlist</p>
              <h2 className="mt-2 text-[28px] font-semibold text-black">Recommended properties</h2>
            </div>
            <p className="text-[14px] text-black/40">{properties.length} matches</p>
          </div>

          {properties.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-[#f5f5f5] p-5 text-[14px] text-black/45">
              No property recommendations were saved for this package.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {properties.map((property, index) => {
                const images = imageUrls(property.images);
                const chips = propertySpecs(property).slice(0, 4);
                return (
                  <article key={property.id} className="grid overflow-hidden rounded-3xl bg-[#f5f5f5] sm:grid-cols-[220px_1fr]">
                    <PropertyImage
                      urls={images}
                      alt={property.title || "Property recommendation"}
                    />
                    <div className="min-w-0 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-black/35">
                            Match {index + 1}
                          </p>
                          <h3 className="mt-2 text-[22px] font-semibold leading-tight text-black">
                            {property.title || "Property recommendation"}
                          </h3>
                          <p className="mt-1 text-[14px] text-black/45">{propertyLocation(property)}</p>
                        </div>
                        <p className="shrink-0 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-black/55 ring-1 ring-black/[0.04]">
                          {property.price_label || "Price on request"}
                        </p>
                      </div>

                      {chips.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {chips.map((chip) => (
                            <span key={chip} className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-black/55">
                              {chip}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <p className="mt-4 line-clamp-2 text-[14px] leading-6 text-black/50">
                        {property.headline || property.description || "A property option selected for this client brief."}
                      </p>

                      {highlights(property.highlights).length > 0 ? (
                        <div className="mt-4 grid gap-2">
                          {highlights(property.highlights).slice(0, 3).map((highlight) => (
                            <p key={highlight} className="text-[13px] leading-5 text-black/50">
                              <span className="mr-2 font-semibold text-black">+</span>
                              {highlight}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <section id="propshort-video" className="rounded-3xl bg-black p-5 text-white">
            <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/40">PropShort</p>
            <h2 className="mt-2 text-[24px] font-semibold text-white">Video package</h2>
            <div className="mt-5 overflow-hidden rounded-2xl bg-white/10">
              {renderedVideo ? (
                <video
                  className="aspect-[9/16] max-h-[620px] w-full bg-black object-contain"
                  src={video?.video_url || ""}
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : (
                <div className="min-h-[360px] bg-[#f5f5f5] p-5 text-black">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">Preview</p>
                  <h3 className="mt-3 text-[28px] font-semibold leading-tight">{title}</h3>
                  <div className="mt-6 grid gap-2">
                    {(videoPreviewProperties.length ? videoPreviewProperties : properties.slice(0, 3)).map((property, index) => (
                      <div key={property.id} className="rounded-2xl bg-white p-3">
                        <p className="text-[14px] font-semibold text-black">{index + 1}. {property.title}</p>
                        <p className="mt-1 text-[12px] text-black/45">
                          {"area" in property ? property.area : propertyLocation(property)}
                          {"price" in property && property.price ? ` - ${property.price}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="mt-4 text-[13px] leading-5 text-white/45">
              {renderedVideo ? "Ready to watch and share." : "The video plan is ready; rendered MP4 may still be processing."}
            </p>
          </section>

          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-3xl bg-white p-6 ring-1 ring-black/[0.06] transition-opacity hover:opacity-80"
            >
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-black/35">PDF report</p>
              <h2 className="mt-3 text-[24px] font-semibold text-black">Open client report</h2>
              <p className="mt-2 text-[14px] leading-6 text-black/45">
                Review the full recommendation report with property details and broker context.
              </p>
              <span className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-[14px] font-semibold text-white">
                Open PDF
              </span>
            </a>
          ) : null}

          {!isLoggedIn ? (
            <section className="rounded-3xl bg-[#c8cc7c] p-6 text-black">
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-black/45">Broker note</p>
              <h2 className="mt-3 text-[22px] font-semibold leading-tight">Want changes?</h2>
              <p className="mt-2 text-[14px] leading-6 text-black/60">
                Ask your broker to refine the brief or generate a fresh package with updated requirements.
              </p>
            </section>
          ) : null}
        </aside>
      </section>
    </div>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <PropShortsLogo width={142} className="h-auto w-[142px]" />
          <p className="hidden text-[12px] font-semibold uppercase tracking-[0.24em] text-black/35 sm:block">
            Shared property package
          </p>
        </div>
      </header>
      <main className="px-5 py-6 sm:px-8 sm:py-8">{children}</main>
      <footer className="mt-8 border-t border-black/[0.06] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-[13px] text-black/40 sm:flex-row sm:items-center sm:justify-between">
          <p>PropShorts</p>
          <p>Short videos. Smart matches. Better decisions.</p>
        </div>
      </footer>
    </div>
  );
}

export default function SharePage({ params }: SharePageProps) {
  const [shareSlug, setShareSlug] = useState("");
  const [pkg, setPkg] = useState<GeneratedPackageRow | null>(null);
  const [properties, setProperties] = useState<PropertyRecommendationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveParams() {
      const resolved = await params;
      if (!cancelled) setShareSlug(resolved.shareSlug);
    }

    resolveParams();

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setIsLoggedIn(Boolean(data.session));
      setSessionChecked(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!shareSlug) return;
    let cancelled = false;

    async function loadShare() {
      try {
        const packageRow = await fetchGeneratedPackageByShareSlug(shareSlug);
        const propertyRows = packageRow ? await fetchPackageProperties(packageRow.run_id) : [];
        if (cancelled) return;
        setPkg(packageRow);
        setProperties(propertyRows);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load shared package.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadShare();

    return () => {
      cancelled = true;
    };
  }, [shareSlug]);

  const content = (
    <PackageContent
      pkg={pkg}
      properties={properties}
      loading={loading || !sessionChecked}
      error={error}
      isLoggedIn={isLoggedIn}
    />
  );

  return isLoggedIn ? <AppLayout>{content}</AppLayout> : <PublicShell>{content}</PublicShell>;
}
