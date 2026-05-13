"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import PropShortsLogo from "@/components/PropShortsLogo";
import { useState } from "react";

// ─── Tweak these to resize the screen ────────────────────────────────────────
const LOGO_WIDTH      = 180;             // px — tm.png logo width
const HEADING_SIZE    = "text-[56px]";   // "Write." font size
const HELPER_SIZE     = "text-[17px]";   // helper text font size
const TEXTAREA_HEIGHT = 260;             // px — min height of textarea
const CHECK_BTN_SIZE  = 64;              // px — check button diameter
const CONTENT_WIDTH   = "max-w-[520px]"; // max width of centered column
// ─────────────────────────────────────────────────────────────────────────────

export default function CreateWritePage() {
  const router = useRouter();
  const [text, setText] = useState("");

  function handleSubmit() {
    if (!text.trim()) return;
    router.push("/create/confirm");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-white px-5 text-black">
      {/* Header — logo */}
      <header className="flex w-full justify-center pb-4 pt-12">
        <PropShortsLogo width={LOGO_WIDTH} />
      </header>

      {/* Main — heading + textarea */}
      <main className={`flex w-full flex-1 flex-col items-center ${CONTENT_WIDTH} mx-auto pt-2`}>
        {/* "Write." heading + helper text */}
        <div className="mb-8 w-full text-center">
          <h1
            className={`${HEADING_SIZE} font-normal leading-[1.1] tracking-[-0.02em] text-black mb-4`}
          >
            Write.
          </h1>
          <p className={`${HELPER_SIZE} font-normal leading-relaxed text-black/60`}>
            &ldquo;Tell us about the type of property you are looking for.&rdquo;
          </p>
        </div>

        {/* Textarea */}
        <textarea
          className="w-full rounded-2xl bg-[#f3f3f3] px-6 py-5 text-[16px] font-normal leading-relaxed text-black placeholder:text-black/30 border-none outline-none focus:ring-2 focus:ring-black/10 resize-none transition-shadow"
          style={{ minHeight: TEXTAREA_HEIGHT }}
          placeholder="E.g., I'm looking for a 3BHK in Bandra, Mumbai. Budget around 1.5 Cr. Client prefers a society with parking and gym…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {/* Check button */}
        <div className="mt-10 mb-6 flex justify-center">
          <button
            onClick={handleSubmit}
            aria-label="Submit"
            className="flex items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-30"
            style={{ width: CHECK_BTN_SIZE, height: CHECK_BTN_SIZE }}
            disabled={!text.trim()}
          >
            {/* Checkmark SVG */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ width: CHECK_BTN_SIZE * 0.45, height: CHECK_BTN_SIZE * 0.45 }}
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </main>

      {/* Footer — Tips + Cancel */}
      <footer className="flex w-full flex-col items-center gap-5 pb-14 pt-4">
        <Link
          href="/tips"
          className="text-[17px] font-normal text-black/50 transition-opacity hover:opacity-70"
        >
          Tips
        </Link>
        <Link
          href="/create/select"
          className="text-[22px] font-normal text-black transition-opacity hover:opacity-50"
        >
          Cancel
        </Link>
      </footer>
    </div>
  );
}
