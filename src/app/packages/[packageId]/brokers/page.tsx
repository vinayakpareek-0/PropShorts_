import Link from "next/link";
import SidebarShell from "@/components/layout/SidebarShell";
import BrokerCard from "@/components/lists/BrokerCard";
import { mockInternalTraces, mockProperties } from "@/data/mock";

const CARD_COLORS = ["#D489FF", "#C5C97A", "#9E94DF"];
const BROKERAGES = ["Bandra Property Hub", "Andheri Estates", "Pali Properties"];

interface BrokersPageProps {
  params: Promise<{ packageId: string }>;
}

export function generateStaticParams() {
  return [{ packageId: "pkg-001" }, { packageId: "pkg-002" }, { packageId: "pkg-003" }];
}

export default async function ListingBrokersPage({ params }: BrokersPageProps) {
  const { packageId } = await params;

  const cards = mockInternalTraces.map((trace, i) => {
    const prop = mockProperties[i];
    const priceLabel = prop ? `INR ${(prop.price / 1_000_000).toFixed(1)} Cr` : "-";
    const details = prop ? `Buy | ${prop.sqft.toLocaleString()} SF | ${priceLabel}` : "-";
    const refLine = [trace.listingId, trace.platform].filter(Boolean).join("   ");

    return {
      key: trace.id,
      bgColor: CARD_COLORS[i % CARD_COLORS.length],
      propertyTitle: prop?.title ?? `Property ${i + 1}`,
      details,
      refLine,
      brokerName: trace.agentName ?? "-",
      brokerage: BROKERAGES[i % BROKERAGES.length],
      phone: trace.agentPhone ?? "",
    };
  });

  return (
    <SidebarShell>
      <div className="flex min-h-full flex-col items-center bg-white px-5 text-black">
        <main className="mx-auto flex w-full max-w-[540px] flex-1 flex-col items-center">
          <div className="mb-10 mt-24 w-full text-center">
            <h1 className="text-[36px] font-light leading-[1.1] tracking-[-0.02em] text-black sm:text-[44px]">
              Listing Brokers
            </h1>
            <p className="mt-2 text-[13px] font-medium uppercase tracking-widest text-black/40">
              REF: PKG-001
            </p>
          </div>

          <div className="flex w-full flex-col gap-5 pb-10">
            {cards.map(({ key, ...card }) => (
              <BrokerCard key={key} {...card} />
            ))}
          </div>
        </main>

        <footer className="flex w-full flex-col items-center gap-2 pb-10 pt-6">
          <Link
            href={`/packages/${packageId}`}
            className="text-[15px] font-medium text-black underline underline-offset-2 transition-opacity hover:opacity-60"
          >
            Back to Package
          </Link>
          <p className="mt-2 text-[12px] text-black/25">2026 propshorts</p>
        </footer>
      </div>
    </SidebarShell>
  );
}
