"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import AuthLayout from "@/components/layout/AuthLayout";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage("Password reset link sent. Check your email.");
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Reset your password."
      subtitle="Send a secure reset link to your email and come back to set a new password."
    >
      <div className="rounded-[24px] bg-white p-6 ring-1 ring-black/[0.08] sm:p-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-black/35">
          Forgot password
        </p>
        <h2 className="mt-3 text-[36px] font-normal leading-tight tracking-[-0.02em] text-black">
          Get a reset link.
        </h2>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-[13px] font-medium text-black/55">Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="mt-2 h-12 w-full rounded-xl border border-black/[0.08] bg-[#f7f7f7] px-4 text-[15px] text-black outline-none transition focus:border-black/20 focus:bg-white"
              placeholder="you@example.com"
            />
          </label>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>}
          {message && <p className="rounded-xl bg-[#eef6e1] px-4 py-3 text-[13px] text-black/70">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-black text-[15px] font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-black/45">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-black hover:opacity-60">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
