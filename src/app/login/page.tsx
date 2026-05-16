"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import AuthLayout from "@/components/layout/AuthLayout";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { loading, session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace("/dashboard");
    }
  }, [loading, router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    router.replace(params.get("next") || "/dashboard");
  }

  return (
    <AuthLayout>
      <div className="rounded-[24px] bg-white p-6 ring-1 ring-black/[0.08] sm:p-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-black/35">
          Sign in
        </p>
        <h2 className="mt-3 text-[38px] font-normal leading-tight tracking-[-0.02em] text-black">
          Continue your workspace.
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

          <label className="block">
            <span className="text-[13px] font-medium text-black/55">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="mt-2 h-12 w-full rounded-xl border border-black/[0.08] bg-[#f7f7f7] px-4 text-[15px] text-black outline-none transition focus:border-black/20 focus:bg-white"
              placeholder="Enter your password"
            />
          </label>

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-[13px] font-medium text-black/45 hover:text-black">
              Forgot password?
            </Link>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-black text-[15px] font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-black/45">
          New to PropShorts?{" "}
          <Link href="/signup" className="font-semibold text-black hover:opacity-60">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
