"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/layout/AuthLayout";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password updated. Redirecting to your dashboard...");
    setTimeout(() => router.replace("/dashboard"), 1200);
  }

  return (
    <AuthLayout
      eyebrow="Secure update"
      title="Choose a new password."
      subtitle="Use the reset link from your email, then set a fresh password for your broker workspace."
    >
      <div className="rounded-[24px] bg-white p-6 ring-1 ring-black/[0.08] sm:p-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-black/35">
          Reset password
        </p>
        <h2 className="mt-3 text-[36px] font-normal leading-tight tracking-[-0.02em] text-black">
          Set your new password.
        </h2>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-[13px] font-medium text-black/55">New password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-2 h-12 w-full rounded-xl border border-black/[0.08] bg-[#f7f7f7] px-4 text-[15px] text-black outline-none transition focus:border-black/20 focus:bg-white"
              placeholder="Minimum 6 characters"
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-medium text-black/55">Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-2 h-12 w-full rounded-xl border border-black/[0.08] bg-[#f7f7f7] px-4 text-[15px] text-black outline-none transition focus:border-black/20 focus:bg-white"
              placeholder="Repeat password"
            />
          </label>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>}
          {message && <p className="rounded-xl bg-[#eef6e1] px-4 py-3 text-[13px] text-black/70">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-black text-[15px] font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-black/45">
          Back to{" "}
          <Link href="/login" className="font-semibold text-black hover:opacity-60">
            sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
