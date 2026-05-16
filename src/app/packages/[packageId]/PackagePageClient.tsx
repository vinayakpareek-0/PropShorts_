"use client";

import { useState } from "react";
import Link from "next/link";
import SidebarShell from "@/components/layout/SidebarShell";
import { mockPackageDetail } from "@/data/mock";

const THUMB_W = 132;
const THUMB_H = 80;

interface PackagePageClientProps {
  packageId: string;
}

export default function PackagePageClient({ packageId }: PackagePageClientProps) {
  const pkg = mockPackageDetail;
  const [shared, setShared] = useState(false);

  const refCode = pkg.id.replace("pkg-", "PKG-").toUpperCase();
  const dateLabel = new Date(pkg.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const clientName = pkg.requirement?.clientName ?? "Client";
  const brief = pkg.requirement?.refinedRequirementsJson
    ? `${pkg.requirement.refinedRequirementsJson.bedrooms}BHK ${pkg.requirement.refinedRequirementsJson.propertyType} - ${pkg.requirement.refinedRequirementsJson.location}`
    : pkg.packageTitle;

  const propshortId = pkg.videos?.[0]?.id ?? `${packageId}-video`;
  const pdfId = pkg.pdfId ?? `${packageId}-pdf`;

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
              Your PropShort and PDF are ready to share with your client.
            </p>
          </div>

          <div className="flex w-full flex-col gap-4">
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
          </div>
        </main>

        <footer className="mx-auto flex w-full max-w-[500px] flex-col items-center gap-5 pb-14 pt-8">
          <button
            onClick={handleShare}
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
