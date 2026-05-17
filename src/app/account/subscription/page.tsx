"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import {
  FREE_PLAN,
  STARTER_PLAN,
  fetchUsageSummary,
} from "@/lib/propshorts/clientData";

export default function SubscriptionPage() {
  const [usage, setUsage] = useState({ pdfs: 0, propshorts: 0, packages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadUsage() {
      try {
        const summary = await fetchUsageSummary();
        if (!cancelled) setUsage({ pdfs: summary.pdfs, propshorts: summary.propshorts, packages: summary.packages });
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load usage.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUsage();

    return () => {
      cancelled = true;
    };
  }, []);

  const usageRows = [
    { label: "PropShorts", value: usage.propshorts, limit: STARTER_PLAN.monthlyPropShortLimit },
    { label: "PDF reports", value: usage.pdfs, limit: STARTER_PLAN.monthlyPdfLimit },
    { label: "Packages saved", value: usage.packages, limit: STARTER_PLAN.monthlyPropShortLimit },
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-6 rounded-3xl bg-white p-8 ring-1 ring-black/[0.06] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/account"
              className="text-[13px] font-medium uppercase tracking-[0.24em] text-black/35 transition-opacity hover:opacity-60"
            >
              Account
            </Link>
            <h1 className="mt-3 text-[40px] font-light leading-none tracking-[-0.02em] text-black sm:text-[56px]">
              Plan.
            </h1>
            <p className="mt-4 max-w-xl text-[16px] leading-7 text-black/50">
              Pricing is shown here for testing the product flow. Stripe checkout will be connected later.
            </p>
          </div>

          <div className="rounded-2xl bg-black p-5 text-white lg:w-[280px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Active plan
            </p>
            <p className="mt-2 text-[32px] font-semibold leading-none">{STARTER_PLAN.name}</p>
            <p className="mt-2 text-[14px] text-white/55">{STARTER_PLAN.priceLabel}</p>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-black/[0.06] bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-black/35">
                  Monthly usage
                </p>
                <h2 className="mt-2 text-[26px] font-semibold text-black">Current allowance</h2>
              </div>
              <Link
                href="/new-propshort"
                className="rounded-xl bg-black px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-80"
              >
                Create
              </Link>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl bg-red-50 p-5 text-[14px] text-red-600">{error}</div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {usageRows.map((item) => {
                  const percent = Math.min(100, Math.round((item.value / item.limit) * 100));
                  return (
                    <div key={item.label} className="rounded-2xl bg-[#f5f5f5] p-5">
                      <p className="text-[13px] font-medium text-black/45">{item.label}</p>
                      <p className="mt-3 text-[32px] font-semibold leading-none text-black">
                        {loading ? "-" : item.value}
                        <span className="text-[14px] font-medium text-black/35"> / {item.limit}</span>
                      </p>
                      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-[#c8cc7c]"
                          style={{ width: `${loading ? 0 : percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-black/[0.06] bg-white p-6">
            <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-black/35">
              Plans
            </p>
            <div className="mt-5 grid gap-4">
              {[FREE_PLAN, STARTER_PLAN].map((plan) => (
                <div key={plan.id} className="rounded-2xl bg-[#f5f5f5] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[22px] font-semibold text-black">{plan.name}</p>
                      <p className="mt-1 text-[14px] text-black/45">{plan.priceLabel}</p>
                    </div>
                    {plan.id === STARTER_PLAN.id ? (
                      <span className="rounded-full bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                        Active
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-2">
                    {plan.features.map((feature) => (
                      <p key={feature} className="text-[14px] leading-5 text-black/55">{feature}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-3xl bg-[#c8cc7c] p-6 text-black">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-black/45">
            Stripe later
          </p>
          <h2 className="mt-2 text-[24px] font-semibold">Plan display is active; payments are not collected yet.</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-black/60">
            This keeps UI testing tied to real generated usage while leaving checkout for the Stripe integration phase.
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
