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
        <p className="text-sm font-medium tracking-wide">Tips</p>
        <nav className="flex items-center justify-center gap-6" aria-label="Quick navigation">
          <CircularNavButton href="/pdfs" label="My PDFs">
            <span className="text-sm font-bold tracking-wider">PDF</span>
          </CircularNavButton>

          <CircularNavButton href="/tips" label="Tips">
            {/* Mini film reel icon */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 56 56"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="28" cy="28" r="28" fill="white" />
              <line x1="28" y1="4" x2="28" y2="52" stroke="black" strokeWidth="1.5" />
              <line x1="4" y1="28" x2="52" y2="28" stroke="black" strokeWidth="1.5" />
              <line x1="10.1" y1="10.1" x2="45.9" y2="45.9" stroke="black" strokeWidth="1.5" />
              <line x1="45.9" y1="10.1" x2="10.1" y2="45.9" stroke="black" strokeWidth="1.5" />
              <circle cx="28" cy="28" r="9" fill="white" stroke="black" strokeWidth="1.5" />
              <circle cx="28" cy="12" r="4" fill="black" />
              <circle cx="44" cy="28" r="4" fill="black" />
              <circle cx="28" cy="44" r="4" fill="black" />
              <circle cx="12" cy="28" r="4" fill="black" />
            </svg>
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
