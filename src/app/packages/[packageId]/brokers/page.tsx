import Link from "next/link";
import PropShortsLogo from "@/components/PropShortsLogo";
import BrokerCard from "@/components/lists/BrokerCard";
import { mockInternalTraces, mockProperties } from "@/data/mock";

// ─── Tweak these to resize the screen ────────────────────────────────────────
const LOGO_WIDTH     = 160;              // px — tm.png logo width
const HEADING_SIZE   = "text-[44px]";    // "Listing Brokers" font size
const CONTENT_WIDTH  = "max-w-[540px]";  // max width of centered column
// ─────────────────────────────────────────────────────────────────────────────

const CARD_COLORS = ["#D489FF", "#C5C97A", "#9E94DF"];
const BROKERAGES  = ["Bandra Property Hub", "Andheri Estates", "Pali Properties"];

interface BrokersPageProps {
  params: Promise<{ packageId: string }>;
}

export default async function ListingBrokersPage({ params }: BrokersPageProps) {
  const { packageId } = await params;

  const cards = mockInternalTraces.map((trace, i) => {
    const prop = mockProperties[i];
    const priceLabel = prop
      ? `₹${(prop.price / 1_000_000).toFixed(1)} Cr`
      : "—";
    const details = prop
      ? `Buy | ${prop.sqft.toLocaleString()} SF | ${priceLabel}`
      : "—";
    const refLine = [trace.listingId, trace.platform].filter(Boolean).join("   ");

    return {
      key: trace.id,
      bgColor: CARD_COLORS[i % CARD_COLORS.length],
      propertyTitle: prop?.title ?? `Property ${i + 1}`,
      details,
      refLine,
      brokerName: trace.agentName ?? "—",
      brokerage: BROKERAGES[i % BROKERAGES.length],
      phone: trace.agentPhone ?? "",
    };
  });

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-5 text-black">
      {/* Header — logo */}
      <header className="flex w-full justify-center pb-4 pt-12">
        <PropShortsLogo width={LOGO_WIDTH} />
      </header>

      {/* Main — heading + cards */}
      <main className={`flex w-full flex-1 flex-col items-center ${CONTENT_WIDTH} mx-auto`}>
        {/* Page heading */}
        <div className="mb-10 mt-10 w-full text-center">
          <h1 className={`${HEADING_SIZE} font-light leading-[1.1] tracking-[-0.02em] text-black`}>
            Listing Brokers
          </h1>
          <p className="mt-2 text-[13px] font-medium tracking-widest uppercase text-black/40">
            REF: PKG-001
          </p>
        </div>

        {/* Broker cards */}
        <div className="flex w-full flex-col gap-5 pb-10">
          {cards.map(({ key, ...card }) => (
            <BrokerCard key={key} {...card} />
          ))}
        </div>
      </main>

      {/* Footer — Cancel + copyright */}
      <footer className="flex w-full flex-col items-center gap-2 pb-10 pt-6">
        <Link
          href={`/packages/${packageId}`}
          className="text-[15px] font-medium text-black underline underline-offset-2 hover:opacity-60 transition-opacity"
        >
          ← Cancel
        </Link>
        <p className="mt-2 text-[12px] text-black/25">© 2026 propshorts</p>
      </footer>
    </div>
  );
}
