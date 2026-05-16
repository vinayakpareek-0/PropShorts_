import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { mockPackageDetail } from "@/data/mock";

interface PropshortViewerPageProps {
  params: Promise<{ propshortId: string }>;
}

export function generateStaticParams() {
  return [{ propshortId: "vid-001" }, { propshortId: "vid-002" }, { propshortId: "vid-003" }];
}

export default async function PropshortViewerPage({ params }: PropshortViewerPageProps) {
  const { propshortId } = await params;
  const pkg = mockPackageDetail;
  const primaryProperty = pkg.properties[0];
  const pdfId = pkg.pdfId ?? "pdf-001";

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-5 rounded-3xl bg-white p-8 ring-1 ring-black/[0.06] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/propshorts" className="text-[13px] font-medium uppercase tracking-[0.24em] text-black/35 hover:text-black">
              My PropShorts
            </Link>
            <h1 className="mt-3 text-[40px] font-light leading-none tracking-[-0.02em] text-black sm:text-[56px]">
              PropShort Preview.
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-6 text-black/50">
              Mock video view for {pkg.requirement.clientName}. Real generated playback will connect
              after the video provider phase.
            </p>
          </div>
          <div className="rounded-2xl bg-[#f5f5f5] px-5 py-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/35">Video ID</p>
            <p className="mt-1 text-[16px] font-semibold text-black">{propshortId}</p>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <section className="rounded-3xl bg-black p-5 text-white">
            <div className="flex aspect-video min-h-[360px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#d489ff] via-[#8ecae6] to-[#c8cc7c]">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black text-white shadow-sm">
                <svg viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-10 w-10">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Featured property
                </p>
                <h2 className="mt-2 text-[24px] font-semibold text-white">{primaryProperty?.title}</h2>
                <p className="mt-1 text-[14px] text-white/55">{primaryProperty?.headline}</p>
              </div>
              <p className="text-[13px] text-white/45">Mock player</p>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">
                Package
              </p>
              <h2 className="mt-3 text-[22px] font-semibold leading-tight text-black">
                {pkg.requirement.clientName}
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-black/45">{pkg.packageTitle}</p>
              <div className="mt-5 grid gap-3">
                <Link
                  href={`/pdfs/${pdfId}`}
                  className="rounded-xl bg-black px-5 py-3 text-center text-[14px] font-semibold text-white"
                >
                  Open PDF
                </Link>
                <Link
                  href={`/packages/${pkg.id}/brokers`}
                  className="rounded-xl bg-[#f5f5f5] px-5 py-3 text-center text-[14px] font-semibold text-black"
                >
                  Listing Brokers
                </Link>
              </div>
            </div>

            <div className="rounded-3xl bg-[#f5f5f5] p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">
                Included options
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {pkg.properties.map((property) => (
                  <div key={property.id} className="rounded-2xl bg-white p-4">
                    <p className="text-[14px] font-semibold text-black">{property.area}</p>
                    <p className="mt-1 text-[12px] text-black/45">{property.propertyType}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
