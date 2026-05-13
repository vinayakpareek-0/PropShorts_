import Sidebar from "@/components/sidebar/Sidebar";
import Link from "next/link";

// Mock stats for the preview
const STATS = [
  { label: "PDFs This Month", value: "8 / 30" },
  { label: "PropShorts Made", value: "22 / 30" },
  { label: "Packages Shared", value: "14" },
];

const RECENT = [
  { name: "John Smith", brief: "3BHK — Bandra, Mumbai", date: "May 1", status: "Ready" },
  { name: "Priya Nair", brief: "2BHK — Andheri, Mumbai", date: "May 5", status: "Ready" },
  { name: "Arjun Kapoor", brief: "Villa — Lonavala", date: "May 12", status: "Processing" },
];

export default function SidebarDesignPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7f7] font-[family-name:var(--font-poppins)]">
      {/* ── Sidebar ── */}
      <Sidebar />

      {/* ── Main content ── */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-black/[0.06] bg-white px-8 py-4">
          <div>
            <p className="text-[13px] font-medium text-black/40 uppercase tracking-widest">Dashboard</p>
            <h1 className="text-[22px] font-semibold leading-tight text-black">Good morning, Rahul.</h1>
          </div>
          <Link
            href="/create/select"
            className="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-80"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New PropShort
          </Link>
        </header>

        {/* Page body */}
        <div className="flex-1 px-8 py-8 space-y-8">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white border border-black/[0.06] px-6 py-5">
                <p className="text-[12px] font-medium uppercase tracking-widest text-black/40">{s.label}</p>
                <p className="mt-1 text-[28px] font-semibold leading-tight text-black">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Recent packages */}
          <div>
            <h2 className="mb-4 text-[15px] font-semibold text-black/70">Recent Packages</h2>
            <div className="flex flex-col gap-3">
              {RECENT.map((r) => (
                <div key={r.name} className="flex items-center justify-between rounded-2xl bg-white border border-black/[0.06] px-6 py-4">
                  <div>
                    <p className="text-[15px] font-semibold text-black">{r.name}</p>
                    <p className="text-[13px] text-black/40">{r.brief}</p>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="text-[12px] text-black/30">{r.date}</span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${r.status === "Ready" ? "bg-[#c8cc7c]/30 text-[#5a6200]" : "bg-black/5 text-black/40"}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick nav links */}
          <div>
            <h2 className="mb-4 text-[15px] font-semibold text-black/70">Quick Links</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/pdfs", label: "My PDFs", sub: "View all generated PDFs" },
                { href: "/propshorts", label: "My PropShorts", sub: "View all video packages" },
                { href: "/account", label: "Account", sub: "Profile, billing, security" },
                { href: "/tips", label: "Tips", sub: "Advice for better results" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="rounded-2xl bg-white border border-black/[0.06] px-6 py-4 transition-colors hover:bg-black/[0.02]">
                  <p className="text-[15px] font-semibold text-black">{item.label}</p>
                  <p className="text-[13px] text-black/40">{item.sub}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
