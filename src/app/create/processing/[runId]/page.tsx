import Link from "next/link";
import PropShortsLogo from "@/components/PropShortsLogo";

// ─── Tweak these to resize the screen ────────────────────────────────────────
const LOGO_WIDTH      = 150;             // px — tm.png logo width
const HEADING_SIZE    = "text-[68px]";   // "Creating." font size
const HELPER_SIZE     = "text-[18px]";   // helper text font size
const BAR_HEIGHT      = 32;              // px — progress bar height
const CONTENT_WIDTH   = "max-w-[480px]"; // max width of centered column
// ─────────────────────────────────────────────────────────────────────────────

interface ProcessingPageProps {
  params: Promise<{ runId: string }>;
}

export default async function ProcessingPage({ params }: ProcessingPageProps) {
  const { runId } = await params;

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-white px-5 text-black">
      {/* Header — logo */}
      <header className="flex w-full justify-center pb-4 pt-12">
        <PropShortsLogo width={LOGO_WIDTH} />
      </header>

      {/* Main — heading + helper + progress bar */}
      <main
        className={`flex w-full flex-1 flex-col items-center justify-center ${CONTENT_WIDTH} mx-auto gap-12`}
      >
        <div className="mt-[-60px] flex flex-col items-center gap-5 text-center">
          <h1
            className={`${HEADING_SIZE} font-bold leading-[1.05] tracking-[-0.02em] text-black`}
          >
            Creating.
          </h1>
          <p className={`${HELPER_SIZE} font-normal leading-relaxed text-black/50 max-w-[260px]`}>
            Finding matches and building your video and PDF.
          </p>
        </div>

        {/* Animated gradient progress bar */}
        <div
          className="w-full overflow-hidden rounded-full bg-[#e8e8e8]"
          style={{ height: BAR_HEIGHT }}
          role="progressbar"
          aria-label="Processing"
          aria-valuetext="Loading"
        >
          <div
            className="animate-ticker h-full w-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #9b51e0 0%, #2d9cdb 33%, #56ccf2 66%, #a1c866 100%)",
            }}
          />
        </div>

        {/* Hidden run ID for reference */}
        <span className="sr-only">Run ID: {runId}</span>
      </main>

      {/* Footer — Cancel */}
      <footer className="flex w-full justify-center py-10">
        <Link
          href="/dashboard"
          className="text-[22px] font-normal text-black transition-opacity hover:opacity-50"
        >
          Cancel
        </Link>
      </footer>
    </div>
  );
}
