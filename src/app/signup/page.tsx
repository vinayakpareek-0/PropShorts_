"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import AuthLayout from "@/components/layout/AuthLayout";
import { supabase } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
          phone,
        },
      },
    });

    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setMessage(
      data.session
        ? "Account created. You can continue to the dashboard."
        : "Account created. Check your email to confirm your account.",
    );
  }

  return (
    <AuthLayout
      eyebrow="Broker onboarding"
      title="Create your broker account."
      subtitle="Set up your workspace now; team and client access can come later."
    >
      <div className="rounded-[24px] bg-white p-6 ring-1 ring-black/[0.08] sm:p-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-black/35">
          Sign up
        </p>
        <h2 className="mt-3 text-[36px] font-normal leading-tight tracking-[-0.02em] text-black">
          Start with the broker basics.
        </h2>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-[13px] font-medium text-black/55">Full name</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              autoComplete="name"
              className="mt-2 h-12 w-full rounded-xl border border-black/[0.08] bg-[#f7f7f7] px-4 text-[15px] text-black outline-none transition focus:border-black/20 focus:bg-white"
              placeholder="Rahul Mehta"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-medium text-black/55">Company</span>
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                required
                className="mt-2 h-12 w-full rounded-xl border border-black/[0.08] bg-[#f7f7f7] px-4 text-[15px] text-black outline-none transition focus:border-black/20 focus:bg-white"
                placeholder="RM Realty"
              />
            </label>

            <label className="block">
              <span className="text-[13px] font-medium text-black/55">Phone</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                autoComplete="tel"
                className="mt-2 h-12 w-full rounded-xl border border-black/[0.08] bg-[#f7f7f7] px-4 text-[15px] text-black outline-none transition focus:border-black/20 focus:bg-white"
                placeholder="+91 98765 43210"
              />
            </label>
          </div>

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
              minLength={6}
              autoComplete="new-password"
              className="mt-2 h-12 w-full rounded-xl border border-black/[0.08] bg-[#f7f7f7] px-4 text-[15px] text-black outline-none transition focus:border-black/20 focus:bg-white"
              placeholder="Minimum 6 characters"
            />
          </label>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>}
          {message && <p className="rounded-xl bg-[#eef6e1] px-4 py-3 text-[13px] text-black/70">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-xl bg-black text-[15px] font-semibold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-black/45">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-black hover:opacity-60">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
