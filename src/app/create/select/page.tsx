import CreateLayout from "@/components/layout/CreateLayout";
import Link from "next/link";

const options = [
  {
    id: "propshort_and_pdf",
    title: "PropShort + PDF",
    description:
      "Generate a short narrated video for each property recommendation plus a shareable PDF report.",
    icon: "▶ + 📄",
    credits: "Uses 1 PropShort credit",
    href: "/create/talk",
  },
  {
    id: "pdf_only",
    title: "PDF Only",
    description: "Generate a professional PDF report with property recommendations. No video.",
    icon: "📄",
    credits: "Uses 1 PDF credit",
    href: "/create/talk",
  },
];

export default function CreateSelectPage() {
  return (
    <CreateLayout
      title="What would you like to create?"
      subtitle="Choose the type of output for this client."
      step={1}
      totalSteps={4}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((option) => (
          <Link
            key={option.id}
            href={option.href}
            className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-indigo-500"
          >
            <div className="mb-4 text-3xl">{option.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
              {option.title}
            </h3>
            <p className="mt-2 text-sm text-gray-500">{option.description}</p>
            <p className="mt-4 text-xs font-medium text-gray-400">{option.credits}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex justify-start">
        <Link href="/dashboard" className="text-sm font-medium text-gray-500 hover:text-gray-700">
          ← Cancel
        </Link>
      </div>
    </CreateLayout>
  );
}
