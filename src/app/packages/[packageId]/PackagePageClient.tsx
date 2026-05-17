"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SidebarShell from "@/components/layout/SidebarShell";
import { supabase } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/database.types";

const THUMB_W = 132;
const THUMB_H = 80;

interface PackagePageClientProps {
  packageId: string;
}

type PackageRow = Database["public"]["Tables"]["recommendation_packages"]["Row"];
type RequirementRow = Database["public"]["Tables"]["client_requirements"]["Row"];
type PdfRow = Database["public"]["Tables"]["generated_pdfs"]["Row"];
type VideoRow = Database["public"]["Tables"]["generated_videos"]["Row"];

interface PackageDetailRow extends PackageRow {
  client_requirements: RequirementRow | null;
  generated_pdfs: PdfRow | null;
  generated_videos: VideoRow | null;
}

function refinedBrief(value: Json | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, Json | undefined>;
  const location = typeof data.location === "string" ? data.location : null;
  const propertyType = typeof data.property_type === "string" ? data.property_type : null;
  const bedrooms = typeof data.bedrooms === "number" ? `${data.bedrooms}BHK` : null;
  return [bedrooms, propertyType, location].filter(Boolean).join(" - ") || null;
}

export default function PackagePageClient({ packageId }: PackagePageClientProps) {
  const [pkg, setPkg] = useState<PackageDetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPackage() {
      const { data, error: queryError } = await supabase
        .from("recommendation_packages")
        .select(`
          *,
          client_requirements (*),
          generated_pdfs (*),
          generated_videos (*)
        `)
        .eq("id", packageId)
        .single();

      if (cancelled) return;

      if (queryError || !data) {
        setError(queryError?.message || "Could not load this package.");
        setLoading(false);
        return;
      }

      setPkg(data as PackageDetailRow);
      setLoading(false);
    }

    loadPackage();

    return () => {
      cancelled = true;
    };
  }, [packageId]);

  const refCode = (pkg?.id ?? packageId).slice(0, 8).toUpperCase();
  const dateLabel = new Date(pkg?.created_at ?? Date.now()).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const clientName = pkg?.client_requirements?.client_name ?? "Client";
  const brief = useMemo(
    () => refinedBrief(pkg?.client_requirements?.refined_requirements_json ?? null) ?? pkg?.package_title ?? "Generated recommendation package",
    [pkg],
  );

  const propshortId = pkg?.generated_videos?.id || pkg?.video_id || "";
  const pdfId = pkg?.generated_pdfs?.id || pkg?.pdf_id || "";

  function handleShare() {
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  return (
    <SidebarShell>
      <div className="flex min-h-full flex-col items-center justify-between bg-white px-5 text-black">
        <main className="mx-auto flex w-full max-w-[500px] flex-1 flex-col items-center justify-center">
          <div className="mb-8 w-full text-center">
            <h1 className="text-[52px] font-normal leading-[1.05] tracking-[-0.02em] text-black sm:text-[74px]">
              Ready.
            </h1>
            <p className="mx-auto mt-3 max-w-[220px] text-[18px] font-normal leading-relaxed text-black/50">
              {loading ? "Loading your generated package." : error ? error : "Your PropShort and PDF are ready to share with your client."}
            </p>
          </div>

          {!loading && !error ? (
          <div className="flex w-full flex-col gap-4">
            {propshortId ? (
            <Link
              href={`/propshorts/${propshortId}`}
              className="flex w-full items-center gap-5 rounded-2xl bg-[#f2f2f2] p-4 transition-opacity hover:opacity-80"
            >
              <div
                className="flex flex-shrink-0 items-center justify-center rounded-xl"
                style={{
                  width: THUMB_W,
                  height: THUMB_H,
                  background: "linear-gradient(135deg, #d378ff 0%, #c05df1 100%)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-black"
                  style={{ width: 36, height: 36 }}
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div className="flex min-w-0 flex-col justify-between py-1">
                <div>
                  <h3 className="text-[17px] font-semibold leading-tight text-black">{clientName}</h3>
                  <p className="mt-0.5 line-clamp-1 text-[13px] text-black/50">{brief}</p>
                </div>
                <div className="mt-2 flex items-center gap-5 text-[11px] font-medium uppercase tracking-wide text-black/40">
                  <span>{refCode}</span>
                  <span>{dateLabel}</span>
                </div>
              </div>
            </Link>
            ) : null}

            {pdfId ? (
            <Link
              href={`/pdfs/${pdfId}`}
              className="flex w-full items-center gap-5 rounded-2xl bg-[#f2f2f2] p-4 transition-opacity hover:opacity-80"
            >
              <div
                className="flex flex-shrink-0 items-center justify-center rounded-xl bg-black"
                style={{ width: THUMB_W, height: THUMB_H }}
              >
                <span className="text-[20px] font-bold tracking-tighter text-white">PDF</span>
              </div>
              <div className="flex min-w-0 flex-col justify-between py-1">
                <div>
                  <h3 className="text-[17px] font-semibold leading-tight text-black">{clientName}</h3>
                  <p className="mt-0.5 line-clamp-1 text-[13px] text-black/50">{brief}</p>
                </div>
                <div className="mt-2 flex items-center gap-5 text-[11px] font-medium uppercase tracking-wide text-black/40">
                  <span>{refCode}</span>
                  <span>{dateLabel}</span>
                </div>
              </div>
            </Link>
            ) : null}

            {!propshortId && !pdfId ? (
              <div className="rounded-2xl bg-[#f2f2f2] p-5 text-center text-[14px] text-black/45">
                This package does not have generated output records yet.
              </div>
            ) : null}
          </div>
          ) : null}
        </main>

        <footer className="mx-auto flex w-full max-w-[500px] flex-col items-center gap-5 pb-14 pt-8">
          <button
            onClick={handleShare}
            disabled={!pkg}
            className="w-full rounded-xl bg-black py-4 text-[17px] font-medium text-white transition-opacity hover:opacity-80 active:scale-[0.98]"
          >
            {shared ? "Link Copied!" : "Share"}
          </button>
          <Link
            href="/dashboard"
            className="text-[20px] font-normal text-black transition-opacity hover:opacity-50"
          >
            Share Later
          </Link>
          <Link
            href="/dashboard"
            className="text-[14px] font-normal text-black/40 transition-opacity hover:opacity-70"
          >
            Cancel
          </Link>
        </footer>
      </div>
    </SidebarShell>
  );
}
