import Link from "next/link";
import CreateFlowShell from "@/components/create/CreateFlowShell";
import SelectOptionCard from "@/components/create/SelectOptionCard";

const CARD_HEIGHT = 180;

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
    <CreateFlowShell activeStep="select">
        <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center">
          <div className="mb-10 w-full text-center">
            <h1 className="text-[52px] font-light leading-[1.1] tracking-[-0.02em] text-black sm:text-[74px]">
              Select.
            </h1>
          </div>

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

        <footer className="mb-10 flex w-full justify-center bg-white py-10">
          <Link
            href="/dashboard"
            className="text-[22px] font-normal text-black transition-opacity hover:opacity-50"
          >
            Cancel
          </Link>
        </footer>
    </CreateFlowShell>
  );
}
