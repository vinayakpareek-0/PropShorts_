import Image from "next/image";
import Link from "next/link";
import SidebarShell from "@/components/layout/SidebarShell";
import GradientCta from "@/components/dashboard/GradientCta";
import CircularNavButton from "@/components/dashboard/CircularNavButton";

const CTA_SIZE = 300;
const NAV_BTN_SIZE = 72;
const NAV_GAP = "gap-10";
const CTA_LABEL_SIZE = "text-[38px]";

export default function NewPropShortPage() {
  return (
    <SidebarShell>
      <div className="flex min-h-full select-none flex-col items-center justify-between overflow-hidden bg-white px-5 text-black">
        <main className="flex w-full flex-1 flex-col items-center justify-center px-4">
          <Link href="/create/select" aria-label="Send Propshort">
            <GradientCta size={CTA_SIZE} />
          </Link>
          <h2 className={`mt-10 font-normal tracking-tight ${CTA_LABEL_SIZE}`}>
            Send Propshort
          </h2>
        </main>

        <footer className="flex w-full flex-col items-center gap-6 pb-16 pt-8">
          <p className="text-lg font-medium tracking-wide">Tips</p>
          <nav className={`flex items-center justify-center ${NAV_GAP}`} aria-label="Quick navigation">
            <CircularNavButton href="/pdfs" label="My PDFs" size={NAV_BTN_SIZE}>
              <span className="text-base font-bold tracking-wider">PDF</span>
            </CircularNavButton>

            <CircularNavButton href="/tips" label="Tips" size={NAV_BTN_SIZE}>
              <Image
                src="/icon.png"
                alt=""
                width={32}
                height={32}
                className="object-contain invert"
                style={{ width: NAV_BTN_SIZE * 0.45, height: NAV_BTN_SIZE * 0.45 }}
                aria-hidden
              />
            </CircularNavButton>

            <CircularNavButton href="/account" label="Account" size={NAV_BTN_SIZE}>
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ width: NAV_BTN_SIZE * 0.38, height: NAV_BTN_SIZE * 0.38 }}
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
    </SidebarShell>
  );
}
