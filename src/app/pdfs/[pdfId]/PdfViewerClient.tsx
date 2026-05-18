"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import {
  briefFromRequirement,
  copyText,
  fetchPackageByPdfId,
  publicShareUrl,
  refCode,
  shortDate,
  type GeneratedPackageRow,
} from "@/lib/propshorts/clientData";

interface PdfViewerClientProps {
  pdfId: string;
}

export default function PdfViewerClient({ pdfId }: PdfViewerClientProps) {
  const [pkg, setPkg] = useState<GeneratedPackageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        const row = await fetchPackageByPdfId(pdfId);
        if (!cancelled) {
          if (!row) setError("Could not find this generated PDF.");
          setPkg(row);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load this PDF.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [pdfId]);

  const pdfUrl = pkg?.generated_pdfs?.pdf_url || "";
  const clientName = pkg?.client_requirements?.client_name || "Client";
  const title = pkg?.package_title || `PropShorts report for ${clientName}`;

  useEffect(() => {
    if (!pdfUrl) {
      setPreviewUrl("");
      return;
    }

    if (!pdfUrl.startsWith("data:application/pdf;base64,")) {
      setPreviewUrl(pdfUrl);
      return;
    }

    const base64 = pdfUrl.split(",", 2)[1] || "";
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [pdfUrl]);

  async function handleShare() {
    if (!pkg?.share_slug) return;

    await copyText(publicShareUrl(pkg.share_slug));
    setShared(true);
    setTimeout(() => setShared(false), 2200);
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-5 rounded-3xl bg-white p-8 ring-1 ring-black/[0.06] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/pdfs" className="text-[13px] font-medium uppercase tracking-[0.24em] text-black/35 hover:text-black">
              My PDFs
            </Link>
            <h1 className="mt-3 text-[40px] font-light leading-none tracking-[-0.02em] text-black sm:text-[56px]">
              PDF Preview.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-6 text-black/50">
              {loading ? "Loading generated report..." : error || briefFromRequirement(pkg?.client_requirements ?? null)}
            </p>
          </div>
          <div className="rounded-2xl bg-[#f5f5f5] px-5 py-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/35">PDF ID</p>
            <p className="mt-1 text-[16px] font-semibold text-black">{pdfId.slice(0, 8).toUpperCase()}</p>
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl bg-[#f5f5f5] py-20 text-center text-black/45">Loading PDF...</div>
        ) : error ? (
          <div className="rounded-3xl bg-red-50 py-20 text-center text-red-600">{error}</div>
        ) : pkg ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <section className="rounded-3xl bg-[#f5f5f5] p-6">
              {previewUrl ? (
                <iframe
                  title={title}
                  src={previewUrl}
                  className="h-[760px] w-full rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06]"
                />
              ) : (
                <div className="rounded-2xl bg-white p-10 text-center text-black/45">
                  PDF record exists, but no PDF URL was saved.
                </div>
              )}
            </section>

            <aside className="flex flex-col gap-4">
              <div className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">
                  Report
                </p>
                <h2 className="mt-3 text-[22px] font-semibold leading-tight text-black">{title}</h2>
                <p className="mt-2 text-[14px] leading-6 text-black/45">{clientName}</p>
                <p className="mt-4 text-[12px] font-medium uppercase tracking-wide text-black/35">
                  REF {refCode(pkg.id)} · {shortDate(pkg.created_at)}
                </p>
                {previewUrl ? (
                  <a
                    href={previewUrl}
                    download={`${refCode(pkg.id)}.pdf`}
                    className="mt-5 block rounded-xl bg-black px-5 py-3 text-center text-[14px] font-semibold text-white"
                  >
                    Download PDF
                  </a>
                ) : null}
                {pkg.share_slug ? (
                  <button
                    type="button"
                    onClick={handleShare}
                    className="mt-3 block w-full rounded-xl bg-[#c8cc7c] px-5 py-3 text-center text-[14px] font-semibold text-black"
                  >
                    {shared ? "Public Link Copied" : "Share Public Link"}
                  </button>
                ) : null}
              </div>

              <Link
                href={`/packages/${pkg.id}`}
                className="rounded-3xl bg-[#c8cc7c] p-6 text-[15px] font-semibold text-black"
              >
                Open Package
              </Link>
            </aside>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
