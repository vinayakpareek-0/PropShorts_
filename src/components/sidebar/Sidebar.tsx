"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_MAIN = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] flex-shrink-0">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/pdfs",
    label: "My PDFs",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] flex-shrink-0">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    href: "/propshorts",
    label: "My PropShorts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] flex-shrink-0">
        <circle cx="12" cy="12" r="9" />
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/tips",
    label: "Tips",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] flex-shrink-0">
        <path d="M9.663 17h4.673M12 3v1M3.515 8.515l.707.707M20.485 8.515l-.707.707M6 13a6 6 0 1112 0c0 2.21-1.197 4.14-3 5.197V19a1 1 0 01-1 1h-4a1 1 0 01-1-1v-.803C7.197 17.14 6 15.21 6 13z" />
      </svg>
    ),
  },
  {
    href: "/account/subscription",
    label: "Plan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] flex-shrink-0">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
      </svg>
    ),
  },
];

const NAV_BOTTOM = [
  {
    href: "/account",
    label: "Account",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] flex-shrink-0">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

// ─── Helper: single nav link ──────────────────────────────────────────────────
function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-all duration-150 ${
        active
          ? "bg-white/10 text-white"
          : "text-white/50 hover:bg-white/[0.06] hover:text-white/90"
      }`}
    >
      {/* Active left accent */}
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#c8cc7c]" />
      )}
      {icon}
      {label}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="flex h-screen w-[240px] flex-shrink-0 flex-col border-r border-white/[0.07] bg-[#111111]">
      {/* Logo */}
      <div className="flex items-center justify-center px-5 py-8">
        <Image
          src="/tm.png"
          alt="PropShorts"
          width={130}
          height={130}
          className="object-contain invert"
          priority
        />
      </div>

      {/* Main nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {NAV_MAIN.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
          />
        ))}

        {/* Divider */}
        <div className="my-3 h-px bg-white/[0.08]" />

        {/* New PropShort CTA */}
        <Link
          href="/create/select"
          className="flex h-10 items-center gap-2.5 rounded-xl bg-white px-3 text-[14px] font-semibold text-black transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-[16px] w-[16px] flex-shrink-0">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New PropShort
        </Link>
      </nav>

      {/* Bottom nav */}
      <div className="flex flex-col gap-1 border-t border-white/[0.07] px-3 py-4">
        {NAV_BOTTOM.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
          />
        ))}

        {/* Logout */}
        <button className="group flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-white/30 transition-all hover:bg-white/[0.04] hover:text-red-400/80">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] flex-shrink-0">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
