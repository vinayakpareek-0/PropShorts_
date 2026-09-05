"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SidebarShell from "@/components/layout/SidebarShell";
import { supabase } from "@/lib/supabase/client";

interface FunctionResponse {
  success: boolean;
  run_id?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

function friendlyPipelineError(message: string) {
  if (message.includes("PROPERTY_SEARCH_PROVIDER_FAILED")) {
    return "The property search service is unavailable right now. Please try again in a few minutes.";
  }

  if (message.includes("IMAGE_QUALIFIED_SEARCH_FAILED")) {
    return "Could not find enough listings with usable property images. Try a broader location or budget.";
  }

  if (message.includes("UNAUTHORIZED")) {
    return "Please sign in again before generating this package.";
  }

  return message.includes("_") || message.length > 180 ? "Package generation could not be completed. Please try again." : message;
}

async function functionErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;

  const maybeContext = (error as { context?: unknown }).context;
  if (maybeContext instanceof Response) {
    try {
      const body = await maybeContext.clone().json() as { error?: { message?: string }; message?: string };
      return friendlyPipelineError(body.error?.message || body.message || fallback);
    } catch {
      return fallback;
    }
  }

  return error instanceof Error ? friendlyPipelineError(error.message) : fallback;
}

export default function ProcessingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requirementId = searchParams.get("requirementId");
  const propertyCount = searchParams.get("propertyCount") === "5" ? "5" : "3";
  const demoMode = searchParams.get("demo") === "1";
  const runIdFromUrl = searchParams.get("runId");
  const started = useRef(false);

  const [runId, setRunId] = useState(runIdFromUrl);
  const [error, setError] = useState("");

  async function invokeStep(functionName: string, body: Record<string, string>) {
    const { data, error: invokeError } = await supabase.functions.invoke<FunctionResponse>(functionName, { body });

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

    async function startPipeline() {
      if (!requirementId) {
        setError("Missing requirement ID. Please go back and confirm the brief again.");
        return;
      }

      if (runIdFromUrl) {
        setRunId(runIdFromUrl);
        return;
      }

      try {
        const start = await invokeStep("start-recommendation-run", { requirement_id: requirementId });
        const newRunId = start.run_id;
        if (!newRunId) throw new Error("The backend did not return a run ID.");

        setRunId(newRunId);
        const params = new URLSearchParams({ requirementId, propertyCount, runId: newRunId });
        if (demoMode) params.set("demo", "1");
        router.replace(`/create/processing/${newRunId}?${params.toString()}`);

        await invokeStep("process-recommendation-run", {
          run_id: newRunId,
          property_count: propertyCount,
          demo_mode: demoMode ? "true" : "false",
        });
      } catch (pipelineError) {
        const message = pipelineError instanceof Error
          ? friendlyPipelineError(pipelineError.message)
          : "Package generation could not be started. Please try again.";
        setError(message);
      }
    }

    void startPipeline();
  }, [demoMode, propertyCount, requirementId, router, runIdFromUrl]);

  useEffect(() => {
    if (!runId || error) return;
    const activeRunId = runId;
    let cancelled = false;
    let timeoutId: number | undefined;

    async function refreshRun() {
      const { data: run, error: runError } = await supabase
        .from("recommendation_runs")
        .select("status,error_message")
        .eq("id", activeRunId)
        .single();

      if (cancelled) return;

      if (runError || !run) {
        setError("We could not refresh this package. Please return to your dashboard and try again.");
        return;
      }

      if (run.status === "failed") {
        setError(friendlyPipelineError(run.error_message || "Package generation could not be completed. Please try again."));
        return;
      }

      if (run.status === "completed") {
        const { data: pkg, error: packageError } = await supabase
          .from("recommendation_packages")
          .select("id")
          .eq("run_id", activeRunId)
          .maybeSingle();

        if (!cancelled && pkg?.id) {
          router.replace(`/packages/${pkg.id}`);
          return;
        }

        if (!cancelled && packageError) {
          setError("Your package was created, but could not be opened. Please find it in the dashboard.");
          return;
        }
      }

      if (!cancelled) timeoutId = window.setTimeout(refreshRun, 2500);
    }

    void refreshRun();
    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [error, router, runId]);

  const statusCopy = error
    ? error
    : runId
      ? "Working in the background. You can safely leave this page and return to your dashboard later."
      : "Starting your package.";

  return (
    <SidebarShell>
      <div className="flex min-h-full flex-col items-center justify-between bg-white px-5 text-black">
        <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center gap-10">
          <div className="flex flex-col items-center gap-5 text-center">
            <h1 className="text-[52px] font-normal leading-[1.05] tracking-[-0.02em] text-black sm:text-[74px]">
              {error ? "Needs attention." : "Creating."}
            </h1>
            <p className={`max-w-[390px] text-[20px] font-normal leading-relaxed ${error ? "text-red-600" : "text-black"}`}>
              {statusCopy}
            </p>
          </div>

          <div className="w-full rounded-2xl bg-[#f5f5f5] px-5 py-5 text-center">
            <div className="mx-auto h-3 w-[82%] overflow-hidden rounded-full bg-[#e8e8e8]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${error ? "bg-red-500" : "bg-[linear-gradient(90deg,#9b51e0_0%,#2d9cdb_45%,#56ccf2_75%,#a1c866_100%)]"}`}
                style={{ width: error ? "100%" : runId ? "58%" : "18%" }}
              />
            </div>
            <p className="mt-5 text-[14px] leading-6 text-black/50">
              We will save the result to your dashboard as soon as it is ready.
            </p>
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
            Dashboard
          </Link>
        </footer>
      </div>
    </SidebarShell>
  );
}
