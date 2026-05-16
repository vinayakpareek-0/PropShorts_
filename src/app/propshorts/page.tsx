"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SidebarShell from "@/components/layout/SidebarShell";
import PropShortListItem from "@/components/lists/PropShortListItem";

const THUMB_COLORS = ["#cc88ff", "#c4ca7a", "#9988dd", "#c8e244", "#00c0b5", "#d566ff"];

const MOCK_ITEMS = [
  {
    id: "vid-001",
    pdfId: "pdf-001",
    packageId: "pkg-001",
    clientName: "John Smith",
    description: "3BHK Apartment - Bandra, Mumbai",
    refCode: "PKG-001",
    date: "May 1",
    thumbColor: THUMB_COLORS[0],
  },
  {
    id: "vid-002",
    pdfId: "pdf-002",
    packageId: "pkg-002",
    clientName: "Priya Nair",
    description: "2BHK Apartment - Andheri, Mumbai",
    refCode: "PKG-002",
    date: "May 5",
    thumbColor: THUMB_COLORS[1],
  },
  {
    id: "vid-003",
    pdfId: "pdf-003",
    packageId: "pkg-003",
    clientName: "Arjun Kapoor",
    description: "Villa - Lonavala",
    refCode: "PKG-003",
    date: "May 12",
    thumbColor: THUMB_COLORS[2],
  },
];

export default function PropShortsPage() {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return MOCK_ITEMS;

    return MOCK_ITEMS.filter((item) =>
      [item.clientName, item.description, item.refCode, item.date]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query]);

  return (
    <SidebarShell>
      <div className="flex min-h-full flex-col items-center bg-white px-5 text-black">
        <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center">
          <div className="mb-6 mt-16 w-full text-center sm:mt-24">
            <h1 className="text-[36px] font-light leading-[1.1] tracking-[-0.02em] text-black sm:text-[44px]">
              My Propshorts
            </h1>
            <p className="mt-1.5 text-[14px] text-black/40">
              {MOCK_ITEMS.length}/30 Propshorts Made This Month
            </p>
          </div>

          <label className="relative mb-5 w-full">
            <span className="sr-only">Search PropShorts</span>
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

          {MOCK_ITEMS.length === 0 ? (
            <div className="w-full rounded-2xl bg-[#f3f3f3] py-16 text-center">
              <p className="text-[17px] font-normal text-black/40">No PropShorts yet.</p>
              <Link
                href="/new-propshort"
                className="mt-4 inline-block text-[15px] font-medium text-black underline underline-offset-2 transition-opacity hover:opacity-60"
              >
                Create your first PropShort
              </Link>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="w-full rounded-2xl bg-[#f5f5f5] py-14 text-center">
              <p className="text-[17px] font-medium text-black/55">No matching PropShorts</p>
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
                <PropShortListItem key={item.id} {...item} />
              ))}
            </div>
          )}
        </main>

        <footer className="flex w-full flex-col items-center gap-2 pb-10 pt-10">
          <Link
            href="/dashboard"
            className="text-[15px] font-medium text-black underline underline-offset-2 transition-opacity hover:opacity-60"
          >
            Back to Dashboard
          </Link>
          <p className="mt-2 text-[12px] text-black/25">2026 propshorts</p>
        </footer>
      </div>
    </SidebarShell>
  );
}
