"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SidebarShell from "@/components/layout/SidebarShell";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  STARTER_PLAN,
  briefFromRequirement,
  fetchBrokerProfile,
  fetchUsageSummary,
  refCode,
  shortDate,
  type BrokerProfileRow,
  type GeneratedPackageRow,
} from "@/lib/propshorts/clientData";

const quickLinks = [
  { href: "/propshorts", label: "PropShorts", sub: "Video packages", tone: "bg-[#d489ff]" },
  { href: "/pdfs", label: "PDFs", sub: "Generated reports", tone: "bg-[#c8cc7c]" },
  { href: "/tips", label: "Tips", sub: "Better briefs", tone: "bg-[#8ecae6]" },
  { href: "/account", label: "Account", sub: "Profile settings", tone: "bg-[#f0d35f]" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BrokerProfileRow | null>(null);
  const [recent, setRecent] = useState<GeneratedPackageRow[]>([]);
  const [stats, setStats] = useState({ pdfs: 0, propshorts: 0, packages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [profileRow, usage] = await Promise.all([fetchBrokerProfile(), fetchUsageSummary()]);
        if (cancelled) return;
        setProfile(profileRow);
        setStats({ pdfs: usage.pdfs, propshorts: usage.propshorts, packages: usage.packages });
        setRecent(usage.recent);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Broker";

  return (
    <SidebarShell>
      <div className="min-h-full bg-white px-4 py-5 text-black sm:px-6 sm:py-8 lg:px-8">
        <header className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-3xl bg-[#f2f2f2] p-5 text-black sm:p-8">
            <p className="text-[13px] font-medium uppercase tracking-[0.24em] text-black/35">
              Dashboard
            </p>
            <h1 className="mt-4 text-[42px] font-light leading-none tracking-[-0.03em] sm:text-[58px]">
              Hi, {firstName}.
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] leading-7 text-black/50">
              Create a recommendation package, or continue from generated PropShorts and reports.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/new-propshort"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-black px-5 text-[14px] font-semibold text-white transition-opacity hover:opacity-80"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                New PropShort
              </Link>
              <Link
                href="/tips"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-5 text-[14px] font-semibold text-black transition-colors hover:bg-black/[0.04]"
              >
                Improve Brief
              </Link>
            </div>
          </section>

          <section className="rounded-3xl bg-[#f5f5f5] p-5 sm:p-6">
            <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-black/35">
              This month
            </p>
            <div className="mt-5 grid gap-3">
              {[
                { label: "PDFs", value: stats.pdfs, meta: `of ${STARTER_PLAN.monthlyPdfLimit} on Starter` },
                { label: "PropShorts", value: stats.propshorts, meta: `of ${STARTER_PLAN.monthlyPropShortLimit} on Starter` },
                { label: "Packages", value: stats.packages, meta: "completed and saved" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <div>
                    <p className="text-[14px] font-semibold text-black">{stat.label}</p>
                    <p className="text-[12px] text-black/35">{stat.meta}</p>
                  </div>
                  <p className="text-[28px] font-semibold leading-none text-black">{loading ? "-" : stat.value}</p>
                </div>
              ))}
            </div>
          </section>
        </header>

        <main className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-3xl border border-black/[0.06] bg-white p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-black/35">
                  Work queue
                </p>
                <h2 className="mt-1 text-[24px] font-semibold text-black">Recent packages</h2>
              </div>
              <Link href="/propshorts" className="text-[13px] font-medium text-black/45 hover:text-black">
                View all
              </Link>
            </div>

            {error ? (
              <div className="rounded-2xl bg-red-50 p-5 text-[14px] text-red-600">{error}</div>
            ) : loading ? (
              <div className="rounded-2xl bg-[#f5f5f5] p-5 text-[14px] text-black/45">Loading generated packages...</div>
            ) : recent.length === 0 ? (
              <div className="rounded-2xl bg-[#f5f5f5] p-5 text-[14px] text-black/45">
                No generated packages yet.
              </div>
            ) : (
              <div className="grid gap-3">
                {recent.map((item) => (
                  <Link
                    key={item.id}
                    href={`/packages/${item.id}`}
                    className="grid gap-3 rounded-2xl bg-[#f5f5f5] p-4 transition-colors hover:bg-[#eeeeee] sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-[16px] font-semibold text-black">{item.client_requirements?.client_name || "Client"}</p>
                      <p className="mt-0.5 truncate text-[13px] text-black/45">{briefFromRequirement(item.client_requirements)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[12px] text-black/35">{shortDate(item.created_at)}</span>
                      <span className="rounded-full bg-[#c8cc7c]/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-black/70">
                        {item.status || refCode(item.id)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside>
            <section className="rounded-3xl border border-black/[0.06] bg-white p-5 sm:p-6">
              <p className="text-[13px] font-medium uppercase tracking-[0.22em] text-black/35">
                Shortcuts
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
                {quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-2xl bg-[#f5f5f5] p-4 transition-colors hover:bg-[#eeeeee]"
                  >
                    <span className={`block h-3 w-10 rounded-full ${item.tone}`} />
                    <p className="mt-4 text-[15px] font-semibold text-black">{item.label}</p>
                    <p className="mt-0.5 text-[12px] text-black/40">{item.sub}</p>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </main>
      </div>
    </SidebarShell>
  );
}
