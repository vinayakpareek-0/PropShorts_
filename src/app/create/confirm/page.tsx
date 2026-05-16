"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CreateFlowShell from "@/components/create/CreateFlowShell";
import { supabase } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/database.types";

const CHECK_BTN_SIZE = 64;
const MOCK_RUN_ID = "run-001";

type ClientRequirementRow = Database["public"]["Tables"]["client_requirements"]["Row"];

interface RefinedRequirement {
  location: string | null;
  budget: number | null;
  budget_label: string | null;
  currency: string | null;
  property_type: string | null;
  property_category: "residential" | "commercial" | "land";
  bedrooms: number | null;
  bathrooms: number | null;
  purpose: "buy" | "rent" | "unknown";
  sqft_min: number | null;
  sqft_max: number | null;
  must_haves: string[];
  deal_breakers: string[];
  assumptions: string[];
  missing_fields: string[];
  confidence: number;
  summary: string;
}

interface ParseRequirementResponse {
  success: boolean;
  requirement_id?: string;
  refined_requirement?: RefinedRequirement;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseRefinedRequirement(value: Json | null): RefinedRequirement | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const data = value as Record<string, Json | undefined>;

  return {
    location: typeof data.location === "string" ? data.location : null,
    budget: typeof data.budget === "number" ? data.budget : null,
    budget_label: typeof data.budget_label === "string" ? data.budget_label : null,
    currency: typeof data.currency === "string" ? data.currency : null,
    property_type: typeof data.property_type === "string" ? data.property_type : null,
    property_category:
      data.property_category === "commercial" || data.property_category === "land"
        ? data.property_category
        : "residential",
    bedrooms: typeof data.bedrooms === "number" ? data.bedrooms : null,
    bathrooms: typeof data.bathrooms === "number" ? data.bathrooms : null,
    purpose: data.purpose === "buy" || data.purpose === "rent" ? data.purpose : "unknown",
    sqft_min: typeof data.sqft_min === "number" ? data.sqft_min : null,
    sqft_max: typeof data.sqft_max === "number" ? data.sqft_max : null,
    must_haves: isStringArray(data.must_haves) ? data.must_haves : [],
    deal_breakers: isStringArray(data.deal_breakers) ? data.deal_breakers : [],
    assumptions: isStringArray(data.assumptions) ? data.assumptions : [],
    missing_fields: isStringArray(data.missing_fields) ? data.missing_fields : [],
    confidence: typeof data.confidence === "number" ? data.confidence : 0,
    summary: typeof data.summary === "string" ? data.summary : "",
  };
}

function formatBudget(refined: RefinedRequirement) {
  if (refined.budget_label) return refined.budget_label;
  if (!refined.budget) return "Not captured";

  if (refined.currency === "INR") {
    return `INR ${(refined.budget / 10_000_000).toFixed(2)} Cr`;
  }

  return `${refined.currency ?? ""} ${refined.budget.toLocaleString()}`.trim();
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not captured";
  return String(value);
}

export default function CreateConfirmPage() {
  const [requirement, setRequirement] = useState<ClientRequirementRow | null>(null);
  const [refined, setRefined] = useState<RefinedRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
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

    async function loadAndParseRequirement() {
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

      const existingRefined = parseRefinedRequirement(data.refined_requirements_json);

      if (existingRefined) {
        setRefined(existingRefined);
        setLoading(false);
        return;
      }

      setLoading(false);
      setParsing(true);

      const { data: parseData, error: parseError } = await supabase.functions.invoke<ParseRequirementResponse>(
        "parse-client-requirement",
        {
          body: {
            requirement_id: savedRequirementId,
          },
        },
      );

      if (cancelled) return;

      setParsing(false);

      if (parseError) {
        setError(parseError.message || "Could not refine this requirement.");
        return;
      }

      if (!parseData?.success || !parseData.refined_requirement) {
        setError(parseData?.error?.message || "Could not refine this requirement.");
        return;
      }

      setRefined(parseData.refined_requirement);
    }

    loadAndParseRequirement();

    return () => {
      cancelled = true;
    };
  }, []);

  const canContinue = Boolean(requirement && refined && !loading && !parsing && !error);

  return (
    <CreateFlowShell activeStep="confirm">
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center py-10">
        <div className="mb-8 w-full text-center">
          <h1 className="text-[52px] font-normal leading-[1.1] tracking-[-0.02em] text-black sm:text-[74px]">
            Confirm.
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-black/45">
            Review the interpreted brief before PropShorts searches for matches.
          </p>
        </div>

        <section className="mb-8 w-full rounded-3xl bg-[#f3f3f3] px-6 py-7 sm:px-8">
          {loading ? (
            <p className="text-center text-[17px] font-normal leading-loose text-black/60">
              Loading your saved brief...
            </p>
          ) : error ? (
            <p className="text-center text-[17px] font-normal leading-loose text-red-600">
              {error}
            </p>
          ) : parsing ? (
            <div className="py-8 text-center">
              <div className="mx-auto h-2 w-28 overflow-hidden rounded-full bg-white">
                <div className="h-full w-1/2 animate-ticker rounded-full bg-black" />
              </div>
              <p className="mt-5 text-[13px] font-medium uppercase tracking-[0.24em] text-black/35">
                Refining brief
              </p>
            </div>
          ) : refined ? (
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-black/35">
                {requirement?.client_name || "Client"}
              </p>
              <h2 className="mt-3 text-[24px] font-semibold leading-tight text-black">
                {refined.summary || requirement?.raw_input || "Requirement captured."}
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ["Location", refined.location],
                  ["Budget", formatBudget(refined)],
                  ["Property", refined.property_type],
                  ["Purpose", refined.purpose],
                  ["Bedrooms", refined.bedrooms],
                  ["Size", refined.sqft_min || refined.sqft_max ? `${refined.sqft_min ?? "-"} - ${refined.sqft_max ?? "-"} sqft` : null],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">{label}</p>
                    <p className="mt-1 text-[14px] font-semibold text-black">{formatValue(value)}</p>
                  </div>
                ))}
              </div>

              {refined.must_haves.length ? (
                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/35">
                    Must haves
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {refined.must_haves.map((item) => (
                      <span key={item} className="rounded-full bg-white px-3 py-1 text-[12px] text-black/55">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {refined.assumptions.length || refined.missing_fields.length ? (
                <div className="mt-5 rounded-2xl bg-white/70 p-4">
                  {refined.assumptions.length ? (
                    <p className="text-[12px] leading-5 text-black/45">
                      Assumptions: {refined.assumptions.join(", ")}
                    </p>
                  ) : null}
                  {refined.missing_fields.length ? (
                    <p className="mt-1 text-[12px] leading-5 text-black/45">
                      Missing: {refined.missing_fields.join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <div className="flex flex-col items-center gap-6">
          {canContinue && requirement ? (
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
