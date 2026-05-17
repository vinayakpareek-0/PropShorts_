"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import CreateFlowShell from "@/components/create/CreateFlowShell";
import { supabase } from "@/lib/supabase/client";

const TEXTAREA_HEIGHT = 260;
const CHECK_BTN_SIZE = 64;

interface SubmitRequirementResponse {
  success: boolean;
  requirement_id?: string;
  status?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export default function CreateWritePage() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!clientName.trim() || !text.trim() || submitting) return;

    setSubmitting(true);
    setError("");

    const { data, error: invokeError } = await supabase.functions.invoke<SubmitRequirementResponse>(
      "submit-client-requirement",
      {
        body: {
          client_name: clientName.trim(),
          input_type: "text",
          raw_input: text.trim(),
        },
      },
    );

    setSubmitting(false);

    if (invokeError) {
      setError(invokeError.message || "Could not save the requirement.");
      return;
    }

    if (!data?.success || !data.requirement_id) {
      setError(data?.error?.message || "Could not save the requirement.");
      return;
    }

    router.push(`/create/confirm?requirementId=${encodeURIComponent(data.requirement_id)}`);
  }

  return (
    <CreateFlowShell activeStep="write">
      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center pt-10">
        <div className="mb-8 w-full text-center">
          <h1 className="mb-4 text-[52px] font-normal leading-[1.1] tracking-[-0.02em] text-black sm:text-[74px]">
            Write.
          </h1>
          <p className="text-[17px] font-normal leading-relaxed text-black/60">
            &ldquo;Tell us about the type of property you are looking for.&rdquo;
          </p>
        </div>

        <label className="mb-4 w-full">
          <span className="mb-2 block text-[13px] font-medium uppercase tracking-[0.18em] text-black/35">
            Client name
          </span>
          <input
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            className="h-12 w-full rounded-2xl border-none bg-[#f3f3f3] px-5 text-[16px] font-normal text-black outline-none transition-shadow placeholder:text-black/30 focus:ring-2 focus:ring-black/10"
            placeholder="Client name"
            autoComplete="off"
          />
        </label>

        <textarea
          className="w-full resize-none rounded-2xl border-none bg-[#f3f3f3] px-6 py-5 text-[16px] font-normal leading-relaxed text-black outline-none transition-shadow placeholder:text-black/30 focus:ring-2 focus:ring-black/10"
          style={{ minHeight: TEXTAREA_HEIGHT }}
          placeholder="E.g., I'm looking for a 3BHK in Bandra, Mumbai. Budget around 1.5 Cr. Client prefers a society with parking and gym..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {error ? (
          <p className="mt-5 w-full rounded-2xl bg-red-50 px-5 py-4 text-center text-[13px] leading-5 text-red-600">
            {error}
          </p>
        ) : null}

        <div className="mb-6 mt-10 flex justify-center">
          <button
            onClick={handleSubmit}
            aria-label="Submit"
            className="flex items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ width: CHECK_BTN_SIZE, height: CHECK_BTN_SIZE }}
            disabled={!clientName.trim() || !text.trim() || submitting}
          >
            {submitting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
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
            )}
          </button>
        </div>
      </main>

      <footer className="flex w-full flex-col items-center gap-5 bg-white pb-14 pt-4">
        <Link
          href="/tips"
          className="text-[17px] font-normal text-black transition-opacity hover:opacity-70"
        >
          Tips
        </Link>
        <Link
          href="/create/select"
          className="mb-8 text-[22px] font-normal text-black transition-opacity hover:opacity-50"
        >
          Cancel
        </Link>
      </footer>
    </CreateFlowShell>
  );
}
