import Image from "next/image";
import Link from "next/link";
import PropShortsLogo from "@/components/PropShortsLogo";
import GradientCta from "@/components/dashboard/GradientCta";
import CircularNavButton from "@/components/dashboard/CircularNavButton";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen select-none flex-col items-center justify-between overflow-hidden bg-white text-black">
      {/* Header — logo */}
      <header className="flex w-full justify-center pb-8 pt-14">
        <PropShortsLogo />
      </header>

      {/* Main — gradient CTA */}
      <main className="flex w-full flex-1 flex-col items-center justify-center px-4">
        <Link href="/create/select" aria-label="Send Propshort">
          <GradientCta />
        </Link>
        <h2 className="mt-8 text-[32px] font-semibold tracking-tight">Send Propshort</h2>
      </main>

      {/* Footer — nav buttons */}
      <footer className="flex w-full flex-col items-center gap-6 pb-14 pt-8">
        <p className="text-xl font-medium tracking-wide">Tips</p>
        <nav className="flex items-center justify-center gap-6" aria-label="Quick navigation">
          <CircularNavButton href="/pdfs" label="My PDFs">
            <span className="text-sm font-bold tracking-wider">PDF</span>
          </CircularNavButton>

          <CircularNavButton href="/tips" label="Tips">
            <Image
              src="/icon.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain invert"
              aria-hidden
            />
          </CircularNavButton>

          <CircularNavButton href="/account" label="Account">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </CircularNavButton>
        </nav>
      </footer>
    </div>
  );
}
