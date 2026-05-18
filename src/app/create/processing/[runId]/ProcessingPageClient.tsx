"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import SidebarShell from "@/components/layout/SidebarShell";
import { supabase } from "@/lib/supabase/client";

const BAR_HEIGHT = 50;

type StepStatus = "pending" | "running" | "done" | "failed";

interface Step {
  id: "start" | "search" | "video" | "pdf" | "finalize";
  label: string;
  description: string;
  status: StepStatus;
}

interface FunctionResponse {
  success: boolean;
  run_id?: string;
  package_id?: string;
  pdf_id?: string;
  video_id?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

const initialSteps: Step[] = [
  {
    id: "start",
    label: "Starting run",
    description: "Creating the backend job for this requirement.",
    status: "pending",
  },
  {
    id: "search",
    label: "Searching properties",
    description: "Building a client-safe shortlist and internal trace.",
    status: "pending",
  },
  {
    id: "video",
    label: "Preparing video",
    description: "Generating the Remotion video plan.",
    status: "pending",
  },
  {
    id: "pdf",
    label: "Creating PDF",
    description: "Preparing the shareable report.",
    status: "pending",
  },
  {
    id: "finalize",
    label: "Finalizing package",
    description: "Combining outputs into the final package.",
    status: "pending",
  },
];

async function functionErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;

  const maybeContext = (error as { context?: unknown }).context;
  if (maybeContext instanceof Response) {
    try {
      const body = await maybeContext.clone().json() as { error?: { message?: string }; message?: string };
      return body.error?.message || body.message || fallback;
    } catch {
      return fallback;
    }
  }

  return error instanceof Error ? error.message : fallback;
}

function activeStepCopy(steps: Step[]) {
  const failed = steps.find((step) => step.status === "failed");
  if (failed) return failed.description;

  const running = steps.find((step) => step.status === "running");
  if (running) return running.description;

  const doneCount = steps.filter((step) => step.status === "done").length;
  if (doneCount === steps.length) return "Package ready. Opening it now.";

  return "Getting the generation pipeline ready.";
}

export default function ProcessingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requirementId = searchParams.get("requirementId");
  const propertyCount = searchParams.get("propertyCount") === "5" ? "5" : "3";
  const started = useRef(false);

  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [error, setError] = useState("");
  const [packageId, setPackageId] = useState<string | null>(null);

  const progress = useMemo(() => {
    const done = steps.filter((step) => step.status === "done").length;
    const running = steps.some((step) => step.status === "running") ? 0.5 : 0;
    return Math.min(100, ((done + running) / steps.length) * 100);
  }, [steps]);

  function setStepStatus(id: Step["id"], status: StepStatus) {
    setSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, status } : step)),
    );
  }

  async function invokeStep(functionName: string, body: Record<string, string | null>) {
    const { data, error: invokeError } = await supabase.functions.invoke<FunctionResponse>(functionName, {
      body,
    });

    if (invokeError) {
      throw new Error(await functionErrorMessage(invokeError, `${functionName} failed.`));
    }

    if (!data?.success) {
      throw new Error(data?.error?.message || `${functionName} failed.`);
    }

    return data;
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function runPipeline() {
      if (!requirementId) {
        setError("Missing requirement ID. Please go back and confirm the brief again.");
        setStepStatus("start", "failed");
        return;
      }

      let runId = "";
      let videoId: string | null = null;
      let pdfId: string | null = null;

      try {
        setStepStatus("start", "running");
        const start = await invokeStep("start-recommendation-run", {
          requirement_id: requirementId,
        });
        runId = start.run_id || "";
        if (!runId) throw new Error("The backend did not return a run ID.");
        setStepStatus("start", "done");

        setStepStatus("search", "running");
        await invokeStep("run-property-search", { run_id: runId, property_count: propertyCount });
        setStepStatus("search", "done");

        setStepStatus("video", "running");
        const video = await invokeStep("generate-property-video", { run_id: runId, property_count: propertyCount });
        videoId = video.video_id || null;
        setStepStatus("video", "done");

        setStepStatus("pdf", "running");
        const pdf = await invokeStep("generate-pdf-report", { run_id: runId, property_count: propertyCount });
        pdfId = pdf.pdf_id || null;
        setStepStatus("pdf", "done");

        setStepStatus("finalize", "running");
        const finalPackage = await invokeStep("finalize-package", {
          run_id: runId,
          pdf_id: pdfId,
          video_id: videoId,
        });
        if (!finalPackage.package_id) throw new Error("The backend did not return a package ID.");
        setPackageId(finalPackage.package_id);
        setStepStatus("finalize", "done");

        window.setTimeout(() => {
          router.replace(`/packages/${finalPackage.package_id}`);
        }, 650);
      } catch (pipelineError) {
        const message = pipelineError instanceof Error ? pipelineError.message : "Package generation failed.";
        setError(message);
        setSteps((current) =>
          current.map((step) => (step.status === "running" ? { ...step, status: "failed" } : step)),
        );
      }
    }

    runPipeline();
  }, [propertyCount, requirementId, router]);

  const statusCopy = error || activeStepCopy(steps);

  return (
    <SidebarShell>
      <div className="flex min-h-full flex-col items-center justify-between bg-white px-5 text-black">
        <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center gap-10">
          <div className="flex flex-col items-center gap-5 text-center">
            <h1 className="text-[52px] font-normal leading-[1.05] tracking-[-0.02em] text-black sm:text-[74px]">
              {error ? "Needs attention." : packageId ? "Ready." : "Creating."}
            </h1>
            <p className={`max-w-[340px] text-[20px] font-normal leading-relaxed ${error ? "text-red-600" : "text-black"}`}>
              {statusCopy}
            </p>
          </div>

          <div className="w-full">
            <div
              className="mx-auto w-[82%] overflow-hidden rounded-lg bg-[#e8e8e8]"
              style={{ height: BAR_HEIGHT }}
              role="progressbar"
              aria-label="Processing"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
              className={`h-full rounded-lg transition-all duration-500 ${error ? "bg-red-500" : ""}`}
                style={{
                  width: `${Math.max(8, progress)}%`,
                  background: error
                    ? undefined
                    : "linear-gradient(90deg, #9b51e0 0%, #2d9cdb 45%, #56ccf2 75%, #a1c866 100%)",
                }}
              />
            </div>

            <div className="mt-8 grid gap-3">
              {steps.map((step) => (
                <div key={step.id} className="grid grid-cols-[28px_1fr] items-start gap-3 rounded-2xl bg-[#f5f5f5] px-4 py-3">
                  <span
                    className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold ${
                      step.status === "done"
                        ? "bg-[#c8cc7c] text-black"
                        : step.status === "running"
                          ? "bg-black text-white"
                          : step.status === "failed"
                            ? "bg-red-500 text-white"
                            : "bg-white text-black/30"
                    }`}
                  >
                    {step.status === "done" ? "✓" : step.status === "failed" ? "!" : ""}
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-black">{step.label}</p>
                    <p className="mt-0.5 text-[12px] leading-5 text-black/45">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <footer className="mb-10 flex w-full justify-center gap-6 bg-white py-10">
          {error ? (
            <Link
              href={requirementId ? `/create/confirm?requirementId=${encodeURIComponent(requirementId)}` : "/create/write"}
              className="text-[20px] font-normal text-black transition-opacity hover:opacity-50"
            >
              Back to Confirm
            </Link>
          ) : null}
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
