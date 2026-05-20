"use client";

import { useEffect, useState } from "react";
import SidebarShell from "@/components/layout/SidebarShell";
import PageFooter from "@/components/layout/PageFooter";
import BrokerCard from "@/components/lists/BrokerCard";
import {
  fetchPackageBrokerContacts,
  refCode,
  type BrokerContactRow,
  type GeneratedPackageRow,
} from "@/lib/propshorts/clientData";

const CARD_COLORS = ["#D489FF", "#C5C97A", "#9E94DF"];

interface BrokersPageProps {
  params: Promise<{ packageId: string }>;
}

export default function ListingBrokersPage({ params }: BrokersPageProps) {
  const [packageId, setPackageId] = useState("");
  const [pkg, setPkg] = useState<GeneratedPackageRow | null>(null);
  const [contacts, setContacts] = useState<BrokerContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolveParams() {
      const resolved = await params;
      if (!cancelled) setPackageId(resolved.packageId);
    }

    resolveParams();

    return () => {
      cancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!packageId) return;
    let cancelled = false;

    async function loadContacts() {
      try {
        const result = await fetchPackageBrokerContacts(packageId);
        if (cancelled) return;
        setPkg(result.package);
        setContacts(result.contacts);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load listing brokers.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadContacts();

    return () => {
      cancelled = true;
    };
  }, [packageId]);

  return (
    <SidebarShell>
      <div className="flex min-h-full flex-col items-center bg-white px-5 text-black">
        <main className="mx-auto flex w-full max-w-[540px] flex-1 flex-col items-center">
          <div className="mb-10 mt-24 w-full text-center">
            <h1 className="text-[36px] font-light leading-[1.1] tracking-[-0.02em] text-black sm:text-[44px]">
              Listing Brokers
            </h1>
            <p className="mt-2 text-[13px] font-medium uppercase tracking-widest text-black/40">
              REF: {pkg ? refCode(pkg.id) : packageId ? refCode(packageId) : "-"}
            </p>
          </div>

          {error ? (
            <div className="w-full rounded-2xl bg-red-50 p-5 text-center text-[14px] text-red-600">{error}</div>
          ) : loading ? (
            <div className="w-full rounded-2xl bg-[#f3f3f3] p-5 text-center text-[14px] text-black/45">
              Loading broker contacts...
            </div>
          ) : contacts.length === 0 ? (
            <div className="w-full rounded-2xl bg-[#f3f3f3] p-5 text-center text-[14px] text-black/45">
              No broker contact trace was saved for this package.
            </div>
          ) : (
            <div className="flex w-full flex-col gap-5 pb-10">
              {contacts.map((trace, index) => {
                const property = trace.property;
                const details = [
                  property?.rent_or_buy,
                  property?.size_label || (property?.sqft ? `${property.sqft.toLocaleString()} SF` : null),
                  property?.price_label,
                ]
                  .filter(Boolean)
                  .join(" | ");

                return (
                  <BrokerCard
                    key={trace.id}
                    bgColor={CARD_COLORS[index % CARD_COLORS.length]}
                    propertyTitle={property?.title || `Property ${index + 1}`}
                    details={details || property?.headline || "-"}
                    refLine={[trace.listing_id, trace.platform].filter(Boolean).join("   ")}
                    brokerName={trace.agent_name || "Broker contact not found"}
                    brokerage={trace.agent_email || trace.source_url || "Source saved in trace"}
                    phone={trace.agent_phone || ""}
                  />
                );
              })}
            </div>
          )}
        </main>

        <PageFooter href={`/packages/${packageId}`} label="Back to Package" />
      </div>
    </SidebarShell>
  );
}
