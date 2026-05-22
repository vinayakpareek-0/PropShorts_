"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SidebarShell from "@/components/layout/SidebarShell";
import PageFooter from "@/components/layout/PageFooter";
import PdfListItem from "@/components/lists/PdfListItem";
import {
  briefFromRequirement,
  fetchGeneratedPackages,
  packageDisplayName,
  type GeneratedPackageRow,
  refCode,
  shortDate,
} from "@/lib/propshorts/clientData";

export default function PdfsPage() {
  const [query, setQuery] = useState("");
  const [packages, setPackages] = useState<GeneratedPackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPdfs() {
      try {
        const rows = await fetchGeneratedPackages();
        if (!cancelled) setPackages(rows.filter((item) => item.generated_pdfs || item.pdf_id));
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load generated PDFs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPdfs();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return packages;

    return packages.filter((item) =>
      [
        item.client_requirements?.client_name,
        briefFromRequirement(item.client_requirements),
        refCode(item.id),
        shortDate(item.created_at),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [packages, query]);

  return (
    <SidebarShell>
      <div className="flex min-h-full flex-col items-center bg-white px-5 text-black">
        <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center">
          <div className="mb-6 mt-16 w-full text-center sm:mt-24">
            <h1 className="text-[52px] font-light leading-[1.1] tracking-[-0.02em] text-black sm:text-[74px]">
              My PDFs
            </h1>
            <p className="mt-1.5 text-[14px] text-black/40">
              {loading ? "Loading PDFs..." : `${packages.length}/30 PDFs Made This Month`}
            </p>
          </div>

          <label className="relative mb-5 w-full">
            <span className="sr-only">Search PDFs</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-black/30"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by client, area, ref, or date"
              className="h-14 w-full rounded-2xl border border-black/[0.06] bg-[#f5f5f5] pl-12 pr-4 text-[15px] text-black outline-none transition-shadow placeholder:text-black/30 focus:ring-2 focus:ring-black/10 sm:pl-[52px]"
            />
          </label>

          {error ? (
            <div className="w-full rounded-2xl bg-red-50 py-10 text-center text-red-600">{error}</div>
          ) : loading ? (
            <div className="w-full rounded-2xl bg-[#f3f3f3] py-16 text-center">
              <p className="text-[17px] font-normal text-black/40">Loading generated PDFs...</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="w-full rounded-2xl bg-[#f3f3f3] py-16 text-center">
              <p className="text-[17px] font-normal text-black/40">No PDFs yet.</p>
              <Link
                href="/new-propshort"
                className="mt-4 inline-block text-[15px] font-medium text-black underline underline-offset-2 transition-opacity hover:opacity-60"
              >
                Create your first PropShort
              </Link>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="w-full rounded-2xl bg-[#f5f5f5] py-14 text-center">
              <p className="text-[17px] font-medium text-black/55">No matching PDFs</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-3 text-[14px] font-medium text-black underline underline-offset-2"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-3">
              {filteredItems.map((item) => (
                <PdfListItem
                  key={item.id}
                  id={item.generated_pdfs?.id || item.pdf_id || item.id}
                  packageId={item.id}
                  title={packageDisplayName(item)}
                  description={briefFromRequirement(item.client_requirements)}
                  refCode={refCode(item.id)}
                  date={shortDate(item.created_at)}
                  shareSlug={item.share_slug}
                />
              ))}
            </div>
          )}
        </main>

        <PageFooter />
      </div>
    </SidebarShell>
  );
}
