import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

const usage = [
  { label: "PropShorts", value: "3", limit: "30", percent: 10 },
  { label: "PDF reports", value: "3", limit: "30", percent: 10 },
  { label: "Packages shared", value: "14", limit: "Unlimited", percent: 48 },
];

const planFeatures = [
  "Mock frontend access for current MVP phase",
  "PropShort + PDF creation flow",
  "Broker dashboard and package library",
  "Backend billing will be connected later",
];

export default function SubscriptionPage() {
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
              Track package usage and the current MVP plan. Billing, upgrades, and limits are
              placeholders until the backend phase starts.
            </p>
          </div>

          <div className="rounded-2xl bg-black p-5 text-white lg:w-[280px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Current plan
            </p>
            <p className="mt-2 text-[32px] font-semibold leading-none">Starter</p>
            <p className="mt-2 text-[14px] text-white/55">Free during MVP frontend buildout</p>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-black/[0.06] bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-black/35">
                  Monthly usage
                </p>
                <h2 className="mt-2 text-[26px] font-semibold text-black">May allowance</h2>
              </div>
              <button className="rounded-xl bg-black px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-80">
                Upgrade Later
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {usage.map((item) => (
                <div key={item.label} className="rounded-2xl bg-[#f5f5f5] p-5">
                  <p className="text-[13px] font-medium text-black/45">{item.label}</p>
                  <p className="mt-3 text-[32px] font-semibold leading-none text-black">
                    {item.value}
                    <span className="text-[14px] font-medium text-black/35"> / {item.limit}</span>
                  </p>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-[#c8cc7c]"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-black/[0.06] bg-white p-6">
            <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-black/35">
              Included
            </p>
            <div className="mt-5 flex flex-col gap-3">
              {planFeatures.map((feature) => (
                <div key={feature} className="flex items-center gap-3 rounded-2xl bg-[#f5f5f5] p-4">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-black text-white">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="text-[14px] leading-5 text-black/60">{feature}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-3xl bg-[#c8cc7c] p-6 text-black">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-black/45">
                Coming later
              </p>
              <h2 className="mt-2 text-[24px] font-semibold">Billing is intentionally paused.</h2>
              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-black/60">
                We are keeping this page frontend-only until Supabase auth, database ownership, and
                payment decisions are ready.
              </p>
            </div>
            <Link
              href="/new-propshort"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-black px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-80"
            >
              Create PropShort
            </Link>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
