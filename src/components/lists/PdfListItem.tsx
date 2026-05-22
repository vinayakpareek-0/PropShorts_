"use client";

import Link from "next/link";
import { useState } from "react";
import { copyText, publicShareUrl } from "@/lib/propshorts/clientData";

export interface PdfListItemProps {
  id: string;
  packageId: string;
  title: string;
  description: string;
  refCode: string;
  date: string;
  shareSlug: string | null;
}

export default function PdfListItem({
  id,
  packageId,
  title,
  description,
  refCode,
  date,
  shareSlug,
}: PdfListItemProps) {
  const [shared, setShared] = useState(false);

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!shareSlug) return;

    await copyText(publicShareUrl(shareSlug));
    setShared(true);
    setTimeout(() => setShared(false), 1500);
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#e2e2e2] bg-white p-4 transition-shadow hover:shadow-sm sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      {/* Left + middle: link to PDF detail */}
      <Link
        href={`/pdfs/${id}`}
        className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5"
      >
        {/* PDF thumbnail */}
        <div className="flex h-20 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-black sm:h-24 sm:w-20">
          <span className="text-white text-[18px] font-bold tracking-tighter">PDF</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-[18px] font-semibold leading-tight text-black sm:text-[20px]">{title}</h3>
          <p className="mt-0.5 text-[15px] text-black/60 line-clamp-1">{description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-[12px] font-medium text-black/50 bg-[#f3f3f3] px-2.5 py-0.5 rounded-full">
              REF: {refCode}
            </span>
            <span className="text-[12px] text-black/40">{date}</span>
          </div>
        </div>
      </Link>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center justify-end gap-3">
        {/* Phone → listing brokers */}
        <Link
          href={`/packages/${packageId}/brokers`}
          className="w-11 h-11 rounded-full bg-[#f3f3f3] flex items-center justify-center text-black hover:bg-[#e8e8e8] transition-colors"
          aria-label="View listing brokers"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
          </svg>
        </Link>

        {/* Share */}
        <button
          onClick={handleShare}
          disabled={!shareSlug}
          className="w-11 h-11 rounded-full bg-[#f3f3f3] flex items-center justify-center text-black hover:bg-[#e8e8e8] transition-colors disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Share PDF"
        >
          {shared ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
