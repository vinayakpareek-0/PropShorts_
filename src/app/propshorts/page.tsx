import Link from "next/link";
import PropShortsLogo from "@/components/PropShortsLogo";
import PropShortListItem from "@/components/lists/PropShortListItem";

// ─── Tweak these to resize the screen ────────────────────────────────────────
const LOGO_WIDTH     = 160;              // px — tm.png logo width
const HEADING_SIZE   = "text-[44px]";    // "My Propshorts" font size
const CONTENT_WIDTH  = "max-w-[540px]";  // max width of centered column
// ─────────────────────────────────────────────────────────────────────────────

const THUMB_COLORS = ["#cc88ff", "#c4ca7a", "#9988dd", "#c8e244", "#00c0b5", "#d566ff"];

const MOCK_ITEMS = [
  {
    id: "vid-001",
    pdfId: "pdf-001",
    packageId: "pkg-001",
    clientName: "John Smith",
    description: "3BHK Apartment — Bandra, Mumbai",
    refCode: "PKG-001",
    date: "May 1",
    thumbColor: THUMB_COLORS[0],
  },
  {
    id: "vid-002",
    pdfId: "pdf-002",
    packageId: "pkg-002",
    clientName: "Priya Nair",
    description: "2BHK Apartment — Andheri, Mumbai",
    refCode: "PKG-002",
    date: "May 5",
    thumbColor: THUMB_COLORS[1],
  },
  {
    id: "vid-003",
    pdfId: "pdf-003",
    packageId: "pkg-003",
    clientName: "Arjun Kapoor",
    description: "Villa — Lonavala",
    refCode: "PKG-003",
    date: "May 12",
    thumbColor: THUMB_COLORS[2],
  },
];

export default function PropShortsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-5 text-black">
      {/* Header — logo */}
      <header className="flex w-full justify-center pb-4 pt-12">
        <PropShortsLogo width={LOGO_WIDTH} />
      </header>

      {/* Main — heading + list */}
      <main className={`flex w-full flex-1 flex-col items-center ${CONTENT_WIDTH} mx-auto`}>
        {/* Page heading */}
        <div className="mb-8 w-full text-center">
          <h1 className={`${HEADING_SIZE} font-light leading-[1.1] tracking-[-0.02em] text-black`}>
            My Propshorts
          </h1>
          <p className="mt-1.5 text-[14px] text-black/40">
            {MOCK_ITEMS.length}/30 Propshorts Made This Month
          </p>
        </div>

        {/* PropShort list */}
        {MOCK_ITEMS.length === 0 ? (
          <div className="w-full rounded-2xl bg-[#f3f3f3] py-16 text-center">
            <p className="text-[17px] font-normal text-black/40">No PropShorts yet.</p>
            <Link
              href="/create/select"
              className="mt-4 inline-block text-[15px] font-medium text-black underline underline-offset-2 hover:opacity-60 transition-opacity"
            >
              Create your first PropShort →
            </Link>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3">
            {MOCK_ITEMS.map((item) => (
              <PropShortListItem key={item.id} {...item} />
            ))}
          </div>
        )}
      </main>

      {/* Footer — Back + copyright */}
      <footer className="flex w-full flex-col items-center gap-2 pb-10 pt-10">
        <Link
          href="/dashboard"
          className="text-[15px] font-medium text-black underline underline-offset-2 hover:opacity-60 transition-opacity"
        >
          ← Back
        </Link>
        <p className="mt-2 text-[12px] text-black/25">© 2026 propshorts</p>
      </footer>
    </div>
  );
}
