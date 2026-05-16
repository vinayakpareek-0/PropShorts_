import Link from "next/link";
import CreateFlowShell from "@/components/create/CreateFlowShell";

const ORB_SIZE = 224;
const KEYBOARD_SIZE = 64;

export default function CreateTalkPage() {
  return (
    <CreateFlowShell activeStep="talk">
        <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center">
          <div className="mb-16 flex flex-col items-center text-center">
            <h1 className="mb-4 text-[52px] font-light leading-[1.1] tracking-[-0.02em] text-black sm:text-[74px]">
              Talk.
            </h1>
            <p className="max-w-xs text-[18px] font-normal leading-relaxed text-black">
              Describe the property the client rejected. Be detailed.
            </p>
          </div>

          <div
            className="relative mb-8 flex cursor-pointer items-center justify-center rounded-full bg-gradient-to-tr from-[#a855f7] via-[#0ea5e9] to-[#86efac] transition-transform duration-300 hover:scale-105"
            style={{ width: `min(${ORB_SIZE}px, 58vw)`, height: `min(${ORB_SIZE}px, 58vw)` }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-bl from-transparent via-white/20 to-transparent mix-blend-overlay" />
          </div>

          <p className="text-[14px] font-medium tracking-[0.05em] text-black">
            Tap to Interrupt
          </p>
        </main>

        <footer className="flex w-full flex-col items-center gap-6 bg-white pb-16 pt-8">
          <Link
            href="/create/write"
            aria-label="Switch to typed input"
            className="flex items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            style={{ width: KEYBOARD_SIZE, height: KEYBOARD_SIZE }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              style={{ width: KEYBOARD_SIZE * 0.45, height: KEYBOARD_SIZE * 0.45 }}
            >
              <path d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 5H5v-2h2v2zm9 0H8v-2h8v2zm0-3h-2v-2h2v2zm0-3h-2V8h2v2zm3 6h-2v-2h2v2zm0-3h-2v-2h2v2zm0-3h-2V8h2v2z" />
            </svg>
          </Link>

          <Link
            href="/create/select"
            className="mb-4 text-[22px] font-normal text-black transition-opacity hover:opacity-50"
          >
            Cancel
          </Link>
        </footer>
    </CreateFlowShell>
  );
}
