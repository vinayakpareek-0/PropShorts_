"use client";

import { FormEvent, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";

const passwordInputClass =
  "mt-2 block w-full rounded-2xl border border-black/[0.06] bg-[#f5f5f5] px-4 py-3 text-[14px] text-black outline-none transition-shadow placeholder:text-black/25 focus:ring-2 focus:ring-black/10";

export default function SecurityPage() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated.");
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-3xl bg-white p-8 ring-1 ring-black/[0.06]">
          <Link href="/account" className="text-[13px] font-medium uppercase tracking-[0.24em] text-black/35 hover:text-black">
            Account
          </Link>
          <h1 className="mt-3 text-[40px] font-light leading-none tracking-[-0.02em] text-black sm:text-[56px]">Security.</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-6 text-black/50">
            Manage your Supabase Auth password for this signed-in broker account.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
            <div className="mb-5">
              <h2 className="text-[24px] font-semibold text-black">Change password</h2>
              <p className="mt-1 text-[14px] text-black/45">Use a strong password you do not reuse elsewhere.</p>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-5">
              <label className="text-[13px] font-medium text-black/55">
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={passwordInputClass}
                  placeholder="Enter new password"
                />
              </label>
              <label className="text-[13px] font-medium text-black/55">
                Confirm new password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={passwordInputClass}
                  placeholder="Confirm new password"
                />
              </label>
              {error || message ? (
                <p className={`text-[14px] ${error ? "text-red-600" : "text-black/50"}`}>{error || message}</p>
              ) : null}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-black px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-35"
                >
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </section>

          <aside className="flex flex-col gap-5">
            <div className="rounded-3xl bg-[#f5f5f5] p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">Session</p>
              <p className="mt-3 text-[20px] font-semibold text-black">Signed in</p>
              <p className="mt-2 break-words text-[13px] leading-5 text-black/45">{user?.email || "Authenticated broker"}</p>
            </div>

            <div className="rounded-3xl border border-black/[0.06] bg-white p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">Account removal</p>
              <p className="mt-3 text-[18px] font-semibold text-black">Delete account</p>
              <p className="mt-2 text-[13px] leading-5 text-black/45">Deletion requires an admin-side flow so generated package ownership is handled correctly.</p>
              <button className="mt-5 rounded-xl border border-black/10 px-4 py-3 text-[14px] font-semibold text-black/35" disabled>
                Not available
              </button>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
