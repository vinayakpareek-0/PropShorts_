import Link from "next/link";
import PropShortsLogo from "@/components/PropShortsLogo";

// ─── Tweak these to resize the screen ────────────────────────────────────────
const LOGO_WIDTH    = 160;              // px — tm.png logo width
const CONTENT_WIDTH = "max-w-[520px]";  // max width of centered column
// ─────────────────────────────────────────────────────────────────────────────

const SETTINGS = [
  {
    href: "/account/profile",
    title: "Profile",
    desc: "Name, company, and contact details.",
  },
  {
    href: "/account/subscription",
    title: "Subscription",
    desc: "Current plan and monthly usage.",
  },
  {
    href: "/account/payment",
    title: "Payment Info",
    desc: "Billing details and payment method.",
  },
  {
    href: "/account/security",
    title: "Security",
    desc: "Password and account security.",
  },
];

export default function AccountPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-5 text-black">
      {/* Header — logo */}
      <header className="flex w-full justify-center pb-4 pt-12">
        <PropShortsLogo width={LOGO_WIDTH} />
      </header>

      {/* Main — settings cards */}
      <main className={`flex w-full flex-1 flex-col items-center ${CONTENT_WIDTH} mx-auto`}>
        <div className="mt-10 flex w-full flex-col gap-4">
          {SETTINGS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="w-full rounded-2xl border border-[#e2e2e2] bg-[#f3f3f3] px-6 py-5 text-left transition-colors hover:bg-[#eeeeee] focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              <h2 className="text-[20px] font-semibold leading-tight text-black">{s.title}</h2>
              <p className="mt-1 text-[15px] font-normal leading-relaxed text-black/50">{s.desc}</p>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer — Cancel + copyright */}
      <footer className="flex w-full flex-col items-center gap-2 pb-10 pt-10">
        <Link
          href="/dashboard"
          className="text-[15px] font-medium text-black underline underline-offset-2 hover:opacity-60 transition-opacity"
        >
          ← Cancel
        </Link>
        <p className="mt-2 text-[12px] text-black/25">© 2026 propshorts</p>
      </footer>
    </div>
  );
}
