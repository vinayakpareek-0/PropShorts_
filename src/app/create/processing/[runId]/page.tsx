import Link from "next/link";
import SidebarShell from "@/components/layout/SidebarShell";

const BAR_HEIGHT = 50;

interface ProcessingPageProps {
  params: Promise<{ runId: string }>;
}

export function generateStaticParams() {
  return [{ runId: "run-001" }];
}

export default async function ProcessingPage({ params }: ProcessingPageProps) {
  const { runId } = await params;

  return (
    <SidebarShell>
      <div className="flex min-h-full flex-col items-center justify-between bg-white px-5 text-black">
        <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-12">
          <div className="flex flex-col items-center gap-5 text-center">
            <h1 className="text-[52px] font-normal leading-[1.05] tracking-[-0.02em] text-black sm:text-[74px]">
              Creating.
            </h1>
            <p className="max-w-[260px] text-[20px] font-normal leading-relaxed text-black">
              Finding matches and building your video and PDF.
            </p>
          </div>

          <div
            className="mt-24 w-[82%] overflow-hidden rounded-lg bg-[#e8e8e8]"
            style={{ height: BAR_HEIGHT }}
            role="progressbar"
            aria-label="Processing"
            aria-valuetext="Loading"
          >
            <div
              className="animate-ticker h-full  w-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #9b51e0 0%, #2d9cdb 33%, #56ccf2 66%, #a1c866 100%)",
              }}
            />
          </div>

          <span className="sr-only">Run ID: {runId}</span>
        </main>

        <footer className="mb-10 flex w-full justify-center bg-white py-10">
          <Link
            href="/dashboard"
            className="text-[24px] font-normal text-black transition-opacity hover:opacity-50"
          >
            Cancel
          </Link>
        </footer>
      </div>
    </SidebarShell>
  );
}
