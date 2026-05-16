"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CreateFlowShell from "@/components/create/CreateFlowShell";
import { supabase } from "@/lib/supabase/client";

const ORB_SIZE = 224;
const KEYBOARD_SIZE = 64;

type RecordingState = "idle" | "recording" | "ready" | "submitting";

interface SubmitRequirementResponse {
  success: boolean;
  requirement_id?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface TranscribeRequirementResponse {
  success: boolean;
  requirement_id?: string;
  transcribed_text?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function getSupportedMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

  return candidates.find((type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) || "";
}

export default function CreateTalkPage() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("Tap to start recording");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  function clearTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    setError("");

    if (!clientName.trim()) {
      setError("Add the client name before recording.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Audio recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setRecordingState("ready");
        setStatusText("Recording ready");
        clearTimer();
        stopStream();
      };

      recorder.start();
      setDurationSeconds(0);
      setAudioBlob(null);
      setRecordingState("recording");
      setStatusText("Recording... tap to stop");
      timerRef.current = window.setInterval(() => {
        setDurationSeconds((seconds) => seconds + 1);
      }, 1000);
    } catch {
      setError("Microphone permission was blocked or unavailable.");
      clearTimer();
      stopStream();
      setRecordingState("idle");
      setStatusText("Tap to start recording");
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function resetRecording() {
    setAudioBlob(null);
    setDurationSeconds(0);
    setRecordingState("idle");
    setStatusText("Tap to start recording");
    setError("");
  }

  async function submitRecording() {
    if (!audioBlob || !clientName.trim() || recordingState === "submitting") return;

    setRecordingState("submitting");
    setStatusText("Uploading audio...");
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please sign in again before submitting.");
      setRecordingState("ready");
      setStatusText("Recording ready");
      return;
    }

    const extension = audioBlob.type.includes("mp4") ? "mp4" : "webm";
    const audioPath = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("requirement-audio")
      .upload(audioPath, audioBlob, {
        contentType: audioBlob.type || "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      setError(uploadError.message || "Could not upload the recording.");
      setRecordingState("ready");
      setStatusText("Recording ready");
      return;
    }

    setStatusText("Saving requirement...");

    const { data: submitData, error: submitError } = await supabase.functions.invoke<SubmitRequirementResponse>(
      "submit-client-requirement",
      {
        body: {
          client_name: clientName.trim(),
          input_type: "voice",
          audio_file_url: audioPath,
        },
      },
    );

    if (submitError || !submitData?.success || !submitData.requirement_id) {
      setError(submitError?.message || submitData?.error?.message || "Could not save the voice requirement.");
      setRecordingState("ready");
      setStatusText("Recording ready");
      return;
    }

    setStatusText("Transcribing...");

    const { data: transcriptData, error: transcriptError } =
      await supabase.functions.invoke<TranscribeRequirementResponse>("transcribe-requirement-audio", {
        body: {
          requirement_id: submitData.requirement_id,
        },
      });

    if (transcriptError || !transcriptData?.success) {
      setError(transcriptError?.message || transcriptData?.error?.message || "Could not transcribe the recording.");
      setRecordingState("ready");
      setStatusText("Recording ready");
      return;
    }

    router.push(`/create/confirm?requirementId=${encodeURIComponent(submitData.requirement_id)}`);
  }

  const orbLabel =
    recordingState === "recording"
      ? "Stop recording"
      : recordingState === "ready"
        ? "Record again"
        : "Start recording";

  return (
    <CreateFlowShell activeStep="talk">
      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col items-center justify-center py-10">
        <div className="mb-9 flex flex-col items-center text-center">
          <h1 className="mb-4 text-[52px] font-light leading-[1.1] tracking-[-0.02em] text-black sm:text-[74px]">
            Talk.
          </h1>
          <p className="max-w-xs text-[18px] font-normal leading-relaxed text-black">
            Describe what the client wants and what they rejected.
          </p>
        </div>

        <label className="mb-7 w-full">
          <span className="mb-2 block text-center text-[13px] font-medium uppercase tracking-[0.18em] text-black/35">
            Client name
          </span>
          <input
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            className="h-12 w-full rounded-2xl border-none bg-[#f3f3f3] px-5 text-center text-[16px] font-normal text-black outline-none transition-shadow placeholder:text-black/30 focus:ring-2 focus:ring-black/10"
            placeholder="E.g., John Smith"
            autoComplete="off"
            disabled={recordingState === "recording" || recordingState === "submitting"}
          />
        </label>

        <button
          type="button"
          onClick={recordingState === "recording" ? stopRecording : recordingState === "ready" ? resetRecording : startRecording}
          disabled={recordingState === "submitting"}
          aria-label={orbLabel}
          className={`relative mb-8 flex items-center justify-center rounded-full bg-gradient-to-tr from-[#a855f7] via-[#0ea5e9] to-[#86efac] transition-transform duration-300 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 ${
            recordingState === "recording" ? "animate-pulse" : ""
          }`}
          style={{ width: `min(${ORB_SIZE}px, 58vw)`, height: `min(${ORB_SIZE}px, 58vw)` }}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-bl from-transparent via-white/20 to-transparent mix-blend-overlay" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-black/90 text-white">
            {recordingState === "recording" ? (
              <span className="h-8 w-8 rounded-md bg-white" />
            ) : recordingState === "ready" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-9 w-9">
                <path d="M21 12a9 9 0 11-3-6.7" strokeLinecap="round" />
                <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-9 w-9">
                <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
                <path d="M17.3 11a5.3 5.3 0 01-10.6 0H5a7 7 0 006 6.92V21h2v-3.08A7 7 0 0019 11h-1.7z" />
              </svg>
            )}
          </div>
        </button>

        <p className="text-[14px] font-medium tracking-[0.05em] text-black">
          {statusText}
        </p>
        {durationSeconds > 0 ? (
          <p className="mt-2 text-[13px] text-black/40">{durationSeconds}s recorded</p>
        ) : null}

        {error ? (
          <p className="mt-5 w-full rounded-2xl bg-red-50 px-5 py-4 text-center text-[13px] leading-5 text-red-600">
            {error}
          </p>
        ) : null}

        {audioBlob && recordingState !== "submitting" ? (
          <button
            type="button"
            onClick={submitRecording}
            className="mt-7 h-12 rounded-xl bg-black px-7 text-[15px] font-semibold text-white transition-opacity hover:opacity-85"
          >
            Use Recording
          </button>
        ) : null}
      </main>

      <footer className="flex w-full flex-col items-center gap-6 bg-white pb-16 pt-8">
        <Link
          href="/create/write"
          aria-label="Switch to typed input"
          className="flex items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          style={{ width: KEYBOARD_SIZE, height: KEYBOARD_SIZE }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            style={{ width: KEYBOARD_SIZE * 0.45, height: KEYBOARD_SIZE * 0.45 }}
          >
            <path d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 5H5v-2h2v2zm9 0H8v-2h8v2zm0-3h-2v-2h2v2zm0-3h-2V8h2v2zm3 6h-2v-2h2v2zm0-3h-2v-2h2v2zm0-3h-2V8h2v2z" />
          </svg>
        </Link>

        <Link
          href="/create/select"
          className="mb-4 text-[22px] font-normal text-black transition-opacity hover:opacity-50"
        >
          Cancel
        </Link>
      </footer>
    </CreateFlowShell>
  );
}
