"use client";

import Link from "next/link";
import { useState } from "react";
import { copyText, publicShareUrl } from "@/lib/propshorts/clientData";

export interface PropShortListItemProps {
  id: string;
  pdfId: string;
  packageId: string;
  title: string;
  description: string;
  refCode: string;
  date: string;
  thumbColor: string;
  shareSlug: string | null;
}

export default function PropShortListItem({
  id,
  pdfId,
  packageId,
  title,
  description,
  refCode,
  date,
  thumbColor,
  shareSlug,
}: PropShortListItemProps) {
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
    <div className="flex flex-col gap-4 rounded-xl border border-[#e2e2e2] bg-[#f3f3f3] p-4 transition-colors hover:bg-[#eeeeee] sm:flex-row sm:items-center sm:justify-between">
      {/* Left + middle: link to propshort detail */}
      <Link href={`/propshorts/${id}`} className="flex items-center gap-4 flex-1 min-w-0">
        {/* Thumbnail */}
        <div
          className="flex-shrink-0 w-20 h-14 rounded-lg flex items-center justify-center"
          style={{ background: thumbColor }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-black/70" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>

        {/* Info */}
        <div className="flex flex-col min-w-0">
          <h3 className="text-[14px] font-semibold leading-tight text-black truncate">{title}</h3>
          <p className="text-[13px] text-black/60 leading-tight truncate">{description}</p>
          <p className="text-[11px] text-black/40 mt-0.5 tracking-wide">REF: {refCode}</p>
        </div>
      </Link>

      {/* Right: date + actions */}
      <div className="flex flex-shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:gap-2">
        <span className="text-[12px] text-black/40">{date}</span>
        <div className="flex items-center gap-2.5">
          {/* PDF → pdf detail */}
          <Link
            href={`/pdfs/${pdfId}`}
            className="text-[10px] font-bold text-white bg-black px-2 py-0.5 rounded-full uppercase tracking-wider hover:bg-black/70 transition-colors"
          >
            PDF
          </Link>

          {/* Phone → listing brokers */}
          <Link
            href={`/packages/${packageId}/brokers`}
            className="text-black hover:text-black/50 transition-colors"
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
            className="text-black hover:text-black/50 transition-colors disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Share PropShort"
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
    </div>
  );
}
