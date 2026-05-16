import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { mockPackageDetail } from "@/data/mock";

interface PdfViewerPageProps {
  params: Promise<{ pdfId: string }>;
}

export function generateStaticParams() {
  return [{ pdfId: "pdf-001" }, { pdfId: "pdf-002" }, { pdfId: "pdf-003" }];
}

export default async function PdfViewerPage({ params }: PdfViewerPageProps) {
  const { pdfId } = await params;
  const pkg = mockPackageDetail;
  const requirement = pkg.requirement.refinedRequirementsJson;

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
              Mock report view for {pkg.requirement.clientName}. Real PDF rendering and downloads will
              connect during the backend phase.
            </p>
          </div>
          <div className="rounded-2xl bg-[#f5f5f5] px-5 py-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/35">PDF ID</p>
            <p className="mt-1 text-[16px] font-semibold text-black">{pdfId}</p>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <section className="rounded-3xl bg-[#f5f5f5] p-6">
            <div className="mx-auto max-w-[560px] rounded-[10px] bg-white p-8 shadow-sm ring-1 ring-black/[0.06]">
              <div className="border-b border-black/10 pb-5">
                <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-black/35">
                  PropShorts Report
                </p>
                <h2 className="mt-3 text-[30px] font-semibold leading-tight text-black">
                  {pkg.packageTitle}
                </h2>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ["Client", pkg.requirement.clientName],
                  ["Location", requirement?.location ?? "Not captured"],
                  ["Budget", requirement ? `INR ${(requirement.budget / 1_000_000).toFixed(1)} Cr` : "Not captured"],
                  ["Purpose", requirement?.purpose ?? "Not captured"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-[#f5f5f5] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">{label}</p>
                    <p className="mt-1 text-[15px] font-semibold text-black">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-4">
                {pkg.properties.map((property, index) => (
                  <div key={property.id} className="rounded-2xl border border-black/[0.06] p-4">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/35">
                      Option {index + 1}
                    </p>
                    <p className="mt-2 text-[18px] font-semibold text-black">{property.title}</p>
                    <p className="mt-1 text-[13px] leading-5 text-black/45">{property.headline}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">
                Actions
              </p>
              <button className="mt-5 w-full rounded-xl bg-black px-5 py-3 text-[14px] font-semibold text-white opacity-35" disabled>
                Download Later
              </button>
              <button className="mt-3 w-full rounded-xl bg-[#f5f5f5] px-5 py-3 text-[14px] font-semibold text-black/40" disabled>
                Share Later
              </button>
            </div>

            <div className="rounded-3xl bg-[#c8cc7c] p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/45">
                Related package
              </p>
              <p className="mt-2 text-[20px] font-semibold leading-tight text-black">{pkg.requirement.clientName}</p>
              <Link
                href={`/packages/${pkg.id}`}
                className="mt-5 inline-flex h-11 items-center rounded-xl bg-black px-4 text-[14px] font-semibold text-white"
              >
                Open Package
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
