"use client";

import { useEffect, useState } from "react";
import {
  fetchGeneratedPackageByShareSlug,
  fetchPackageProperties,
  shortDate,
  type GeneratedPackageRow,
  type PropertyRecommendationRow,
} from "@/lib/propshorts/clientData";

interface SharePageProps {
  params: Promise<{ shareSlug: string }>;
}

function highlights(value: PropertyRecommendationRow["highlights"]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function videoProperties(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return [];
  const properties = (input as { properties?: unknown }).properties;
  if (!Array.isArray(properties)) return [];

  return properties.slice(0, 3).map((property, index) => {
    const record = property && typeof property === "object" ? (property as Record<string, unknown>) : {};
    return {
      id: typeof record.id === "string" ? record.id : `property-${index}`,
      title: typeof record.title === "string" ? record.title : `Property ${index + 1}`,
      area: [record.area, record.city].filter((value): value is string => typeof value === "string" && value.length > 0).join(", "),
    };
  });
}

export default function SharePage({ params }: SharePageProps) {
  const [shareSlug, setShareSlug] = useState("");
  const [pkg, setPkg] = useState<GeneratedPackageRow | null>(null);
  const [properties, setProperties] = useState<PropertyRecommendationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-xs font-bold text-white">
              PS
            </div>
            <span className="font-semibold text-gray-900">PropShorts</span>
          </div>
          <p className="text-xs text-gray-400">Shared property recommendation</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {error ? (
          <div className="rounded-xl bg-red-50 p-5 text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="rounded-xl bg-white p-5 text-sm text-gray-500 ring-1 ring-gray-200">Loading shared package...</div>
        ) : !pkg ? (
          <div className="rounded-xl bg-white p-5 text-sm text-gray-500 ring-1 ring-gray-200">
            This shared package is unavailable or not public.
          </div>
        ) : (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pkg.package_title || "Property recommendation package"}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Shared via PropShorts · {shortDate(pkg.created_at)}
              </p>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Property Recommendations</h2>
              {properties.length === 0 ? (
                <div className="rounded-xl bg-white p-5 text-sm text-gray-500 ring-1 ring-gray-200">
                  No property recommendations were saved for this package.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {properties.map((property) => (
                    <div key={property.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                      <div className="flex h-36 items-center justify-center bg-gray-100 text-sm font-semibold text-gray-400">
                        {property.property_type || "Property"}
                      </div>
                      <div className="p-4">
                        <p className="line-clamp-1 font-semibold text-gray-900">{property.title || "Property recommendation"}</p>
                        <p className="mt-0.5 text-sm text-gray-500">{[property.area, property.city].filter(Boolean).join(", ") || "Location unavailable"}</p>
                        <p className="mt-1 text-sm font-medium text-black">
                          {property.price_label || "Price unavailable"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {highlights(property.highlights).slice(0, 3).map((highlight) => (
                            <span key={highlight} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pkg.generated_videos ? (
              <div>
                <h2 className="mb-4 text-lg font-semibold text-gray-900">PropShort Video Preview</h2>
                <div className="overflow-hidden rounded-xl bg-black p-4 text-white shadow-sm">
                  <div className="relative min-h-[360px] overflow-hidden rounded-lg bg-gradient-to-br from-[#d489ff] via-[#8ecae6] to-[#c8cc7c] p-6 text-black">
                    <div className="absolute inset-3 rounded-lg bg-white/70" />
                    <div className="relative z-10 flex min-h-[312px] flex-col justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/45">PropShorts</p>
                        <h3 className="mt-4 text-3xl font-black leading-tight">{pkg.package_title || "Property video preview"}</h3>
                        <p className="mt-2 text-sm font-medium text-black/55">Generated Remotion plan preview</p>
                      </div>
                      <div className="grid gap-2">
                        {videoProperties(pkg.generated_videos.input_json).map((property, index) => (
                          <div key={property.id} className="rounded-lg bg-white/70 px-3 py-2">
                            <p className="text-sm font-bold">{index + 1}. {property.title}</p>
                            <p className="text-xs text-black/55">{property.area || "Property recommendation"}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-6 w-6">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/45">Preview ready</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {pkg.generated_pdfs?.pdf_url ? (
              <a
                href={pkg.generated_pdfs.pdf_url}
                className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold text-gray-900">PDF Report</p>
                  <p className="text-sm text-gray-500">Open the generated client report</p>
                </div>
                <span className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white">
                  Open PDF
                </span>
              </a>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
