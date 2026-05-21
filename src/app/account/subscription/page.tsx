"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import {
  FREE_PLAN,
  STARTER_PLAN,
  SUBSCRIPTION_PLANS,
  createCheckoutSession,
  fetchBrokerSubscription,
  fetchUsageSummary,
  type BrokerSubscriptionRow,
  type SubscriptionPlanId,
} from "@/lib/propshorts/clientData";

export default function SubscriptionPage() {
  const [usage, setUsage] = useState({ pdfs: 0, propshorts: 0, packages: 0 });
  const [subscription, setSubscription] = useState<BrokerSubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlanId | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsage() {
      try {
        const [summary, billing] = await Promise.all([fetchUsageSummary(), fetchBrokerSubscription()]);
        if (!cancelled) {
          setUsage({ pdfs: summary.pdfs, propshorts: summary.propshorts, packages: summary.packages });
          setSubscription(billing);
        }
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success") setCheckoutMessage("Checkout completed. Stripe is confirming your subscription.");
    if (checkout === "cancelled") setCheckoutMessage("Checkout was cancelled. Your plan was not changed.");
  }, []);

  const activePlanId = (subscription?.plan_id || FREE_PLAN.id) as SubscriptionPlanId;
  const activePlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === activePlanId) || FREE_PLAN;
  const planForUsage = activePlan.id === "free" ? STARTER_PLAN : activePlan;
  const paidStatus = subscription?.status && subscription.status !== "free" ? subscription.status.replace(/_/g, " ") : "Free";

  const usageRows = [
    { label: "PropShorts", value: usage.propshorts, limit: planForUsage.monthlyPropShortLimit },
    { label: "PDF reports", value: usage.pdfs, limit: planForUsage.monthlyPdfLimit },
    { label: "Packages saved", value: usage.packages, limit: planForUsage.monthlyPropShortLimit },
  ];

  async function handleCheckout(planId: SubscriptionPlanId) {
    if (planId === "free") return;
    setCheckoutPlan(planId);
    setCheckoutMessage("");
    try {
      const checkoutUrl = await createCheckoutSession(planId);
      window.location.href = checkoutUrl;
    } catch (checkoutError) {
      setCheckoutMessage(checkoutError instanceof Error ? checkoutError.message : "Could not start checkout.");
      setCheckoutPlan(null);
    }
  }

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
              Manage your monthly PropShort generation allowance and upgrade through secure Stripe checkout.
            </p>
          </div>

          <div className="rounded-2xl bg-black p-5 text-white lg:w-[280px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Active plan
            </p>
            <p className="mt-2 text-[32px] font-semibold leading-none">{activePlan.name}</p>
            <p className="mt-2 text-[14px] text-white/55">{activePlan.priceLabel}</p>
            <p className="mt-4 rounded-full bg-white/10 px-3 py-2 text-[12px] font-semibold capitalize text-white/70">
              {paidStatus}
            </p>
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
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isActive = plan.id === activePlan.id;
                const isPaid = plan.id !== "free";
                return (
                <div key={plan.id} className="rounded-2xl bg-[#f5f5f5] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[22px] font-semibold text-black">{plan.name}</p>
                      <p className="mt-1 text-[14px] text-black/45">{plan.priceLabel}</p>
                    </div>
                    {isActive ? (
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
                  <button
                    type="button"
                    disabled={!isPaid || isActive || checkoutPlan === plan.id}
                    onClick={() => handleCheckout(plan.id)}
                    className="mt-5 w-full rounded-xl bg-black px-4 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:bg-white disabled:text-black/35 disabled:ring-1 disabled:ring-black/[0.08]"
                  >
                    {!isPaid ? "Included" : isActive ? "Current plan" : checkoutPlan === plan.id ? "Opening checkout..." : `Choose ${plan.name}`}
                  </button>
                </div>
                );
              })}
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-3xl bg-[#c8cc7c] p-6 text-black">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-black/45">
            Billing
          </p>
          <h2 className="mt-2 text-[24px] font-semibold">Stripe test checkout is connected.</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-black/60">
            Paid plan changes are confirmed by Stripe webhooks before your active subscription row is updated.
          </p>
          {checkoutMessage ? (
            <p className="mt-4 rounded-2xl bg-white/55 p-4 text-[14px] font-medium text-black/65">{checkoutMessage}</p>
          ) : null}
        </section>
      </div>
    </AppLayout>
  );
}
