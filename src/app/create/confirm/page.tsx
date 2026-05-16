import Link from "next/link";
import CreateFlowShell from "@/components/create/CreateFlowShell";
import { mockRequirement } from "@/data/mock";

const CHECK_BTN_SIZE = 64;
const MOCK_RUN_ID = "run-001";

const req = mockRequirement.refinedRequirementsJson;
const budgetLabel = req
  ? req.currency === "INR"
    ? `INR ${(req.budget / 1_000_000).toFixed(1)} Cr`
    : `$${req.budget.toLocaleString()}`
  : "-";

const SUMMARY_LINES: string[] = req
  ? [
      `Your client ${mockRequirement.clientName} is looking for a ${req.bedrooms}BHK ${req.propertyType} in ${req.location}.`,
      `Budget is around ${budgetLabel} for ${req.purpose === "buy" ? "purchase" : "rent"}. ${req.additionalNotes ?? ""}`.trim(),
    ]
  : [`Your client ${mockRequirement.clientName} is looking for a property. No further details captured yet.`];

export default function CreateConfirmPage() {
  return (
    <CreateFlowShell activeStep="confirm">
        <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center">
          <div className="mb-10 w-full text-center">
            <h1 className="text-[52px] font-normal leading-[1.1] tracking-[-0.02em] text-black sm:text-[74px]">
              Confirm.
            </h1>
          </div>

          <div className="mb-10 w-full rounded-2xl bg-[#f3f3f3] px-8 py-10">
            {SUMMARY_LINES.map((line, i) => (
              <p
                key={i}
                className={`text-center text-[17px] font-normal leading-loose text-black/80${
                  i < SUMMARY_LINES.length - 1 ? " mb-4" : ""
                }`}
              >
                {line}
              </p>
            ))}
          </div>

          <div className="flex flex-col items-center gap-6">
            <Link
              href={`/create/processing/${MOCK_RUN_ID}`}
              aria-label="Confirm and generate"
              className="flex items-center justify-center rounded-full bg-black text-white transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              style={{ width: CHECK_BTN_SIZE, height: CHECK_BTN_SIZE }}
            >
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
            </Link>

            <Link
              href="/create/write"
              className="text-[15px] font-medium tracking-wide text-black transition-opacity hover:opacity-50"
            >
              Edit What You Wrote.
            </Link>
          </div>
        </main>

        <footer className="mb-10 flex w-full justify-center bg-white py-10">
          <Link
            href="/create/select"
            className="text-[22px] font-normal text-black transition-opacity hover:opacity-50"
          >
            Cancel
          </Link>
        </footer>
    </CreateFlowShell>
  );
}
