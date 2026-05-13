import Link from "next/link";
import PropShortsLogo from "@/components/PropShortsLogo";
import SelectOptionCard from "@/components/create/SelectOptionCard";

// ─── Tweak these to resize the screen ────────────────────────────────────────
const LOGO_WIDTH      = 180;          // px — tm.png logo width
const HEADING_SIZE    = "text-[56px]"; // "Select." font size
const CARD_HEIGHT     = 180;           // px — min height of each option card
const CONTENT_WIDTH   = "max-w-[520px]"; // max width of centered column
// ─────────────────────────────────────────────────────────────────────────────

const options = [
  {
    id: "propshort_pdf",
    title: "Propshort + PDF",
    description: "A dynamic narrated video plus a shareable PDF.",
    bgClass: "bg-[#c8cc7c]",
    href: "/create/talk",
  },
  {
    id: "pdf_only",
    title: "PDF Only",
    description: "A clean professional document with all replacement options.",
    bgClass: "bg-[#f3f3f3]",
    href: "/create/talk",
  },
];

export default function CreateSelectPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-white px-5 text-black">
      {/* Header — logo */}
      <header className="flex w-full justify-center pb-4 pt-12">
        <PropShortsLogo width={LOGO_WIDTH} />
      </header>

      {/* Main — heading + cards */}
      <main className={`flex w-full flex-1 flex-col items-center justify-center ${CONTENT_WIDTH} mx-auto`}>
        {/* "Select." heading */}
        <div className="mb-10 w-full text-center">
          <h1
            className={`${HEADING_SIZE} font-light leading-[1.1] tracking-[-0.02em] text-black`}
          >
            Select.
          </h1>
        </div>

        {/* Option cards */}
        <div className="flex w-full flex-col gap-[22px]">
          {options.map((opt) => (
            <SelectOptionCard
              key={opt.id}
              href={opt.href}
              title={opt.title}
              description={opt.description}
              bgClass={opt.bgClass}
              cardHeight={CARD_HEIGHT}
            />
          ))}
        </div>
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
