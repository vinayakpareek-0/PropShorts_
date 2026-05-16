"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ─── Nav definitions ──────────────────────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_MAIN: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] flex-shrink-0">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] flex-shrink-0">
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] flex-shrink-0">
        <circle cx="12" cy="12" r="9" />
        <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/tips",
    label: "Tips",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] flex-shrink-0">
        <path d="M9.663 17h4.673M12 3v1M3.515 8.515l.707.707M20.485 8.515l-.707.707M6 13a6 6 0 1112 0c0 2.21-1.197 4.14-3 5.197V19a1 1 0 01-1 1h-4a1 1 0 01-1-1v-.803C7.197 17.14 6 15.21 6 13z" />
      </svg>
    ),
  },
  {
    href: "/account/subscription",
    label: "Plan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] flex-shrink-0">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
      </svg>
    ),
  },
];

const NAV_BOTTOM: NavItem[] = [
  {
    href: "/account",
    label: "Account",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] flex-shrink-0">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

// ─── Single nav link ──────────────────────────────────────────────────────────
function NavLink({ href, label, icon, active }: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-all duration-150 ${
        active
          ? "bg-white text-black shadow-sm shadow-black/[0.06]"
          : "text-black/40 hover:bg-white/70 hover:text-black/80"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <>
    <aside className="hidden h-screen w-[248px] flex-shrink-0 flex-col border-r border-[#ebebeb] bg-white md:flex">

      {/* Logo */}
      <div className="flex items-center justify-center px-6 pb-6 pt-8">
        <Image
          src="/tm.png"
          alt="PropShorts"
          width={120}
          height={120}
          className="object-contain"
          priority
        />
      </div>

      {/* Main nav — inside a grey card container */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="rounded-2xl bg-[#f5f5f5] p-2">
          <div className="flex flex-col gap-0.5">
            {NAV_MAIN.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={isActive(item.href)}
              />
            ))}
          </div>
        </div>

        {/* New PropShort CTA */}
      </div>

      {/* Bottom nav — another grey card container */}
      <div className="px-4 pb-6 pt-4">
        <Link
          href="/new-propshort"
          className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black text-[13.5px] font-semibold text-white transition-opacity hover:opacity-80 active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New PropShort
        </Link>

        <div className="rounded-2xl bg-[#f5f5f5] p-2">
          <div className="flex flex-col gap-0.5">
            {NAV_BOTTOM.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={isActive(item.href)}
              />
            ))}

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium text-black/30 transition-all hover:bg-white/70 hover:text-red-500"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px] flex-shrink-0">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
    <nav className="fixed inset-x-3 bottom-3 z-50 rounded-3xl border border-black/[0.06] bg-white/95 p-2 shadow-lg shadow-black/[0.08] backdrop-blur md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {[...NAV_MAIN.slice(0, 4), NAV_BOTTOM[0]].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`flex h-12 items-center justify-center rounded-2xl transition-colors ${
              isActive(item.href) ? "bg-[#f5f5f5] text-black" : "text-black/35"
            }`}
          >
            {item.icon}
          </Link>
        ))}
      </div>
    </nav>
    </>
  );
}
