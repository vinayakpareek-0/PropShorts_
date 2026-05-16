"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CreateFlowShell from "@/components/create/CreateFlowShell";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

const CHECK_BTN_SIZE = 64;
const MOCK_RUN_ID = "run-001";

type ClientRequirementRow = Database["public"]["Tables"]["client_requirements"]["Row"];

export default function CreateConfirmPage() {
  const [requirement, setRequirement] = useState<ClientRequirementRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requirementId = params.get("requirementId");

    if (!requirementId) {
      setError("No saved requirement found. Please write the brief again.");
      setLoading(false);
      return;
    }

    const savedRequirementId = requirementId;
    let cancelled = false;

    async function loadRequirement() {
      const { data, error: queryError } = await supabase
        .from("client_requirements")
        .select("*")
        .eq("id", savedRequirementId)
        .single();

      if (cancelled) return;

      if (queryError || !data) {
        setError(queryError?.message || "Could not load the saved requirement.");
        setLoading(false);
        return;
      }

      setRequirement(data);
      setLoading(false);
    }

    loadRequirement();

    return () => {
      cancelled = true;
    };
  }, []);

  const summaryLines = requirement
    ? [
        `Your client ${requirement.client_name || "Client"} is looking for a property based on this brief:`,
        requirement.raw_input || "No written requirement was captured.",
      ]
    : [];

  return (
    <CreateFlowShell activeStep="confirm">
      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center">
        <div className="mb-10 w-full text-center">
          <h1 className="text-[52px] font-normal leading-[1.1] tracking-[-0.02em] text-black sm:text-[74px]">
            Confirm.
          </h1>
        </div>

        <div className="mb-10 w-full rounded-2xl bg-[#f3f3f3] px-8 py-10">
          {loading ? (
            <p className="text-center text-[17px] font-normal leading-loose text-black/60">
              Loading your saved brief...
            </p>
          ) : error ? (
            <p className="text-center text-[17px] font-normal leading-loose text-red-600">
              {error}
            </p>
          ) : (
            summaryLines.map((line, i) => (
              <p
                key={i}
                className={`text-center text-[17px] font-normal leading-loose text-black/80${
                  i < summaryLines.length - 1 ? " mb-4" : ""
                }`}
              >
                {line}
              </p>
            ))
          )}
        </div>

        <div className="flex flex-col items-center gap-6">
          {requirement ? (
            <Link
              href={`/create/processing/${MOCK_RUN_ID}?requirementId=${encodeURIComponent(requirement.id)}`}
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
          ) : null}

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
