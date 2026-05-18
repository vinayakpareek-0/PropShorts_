"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  fetchBrokerProfile,
  saveBrokerProfile,
  type BrokerProfileRow,
} from "@/lib/propshorts/clientData";

const inputClass =
  "mt-2 block w-full rounded-2xl border border-black/[0.06] bg-[#f5f5f5] px-4 py-3 text-[14px] text-black outline-none transition-shadow focus:ring-2 focus:ring-black/10";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BrokerProfileRow | null>(null);
  const [values, setValues] = useState({
    full_name: "",
    company_name: "",
    email: "",
    phone: "",
    profile_photo_url: "",
    website_url: "",
    calendar_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const row = await fetchBrokerProfile();
        if (cancelled) return;
        setProfile(row);
        setValues({
          full_name: row?.full_name || "",
          company_name: row?.company_name || "",
          email: row?.email || user?.email || "",
          phone: row?.phone || "",
          profile_photo_url: row?.profile_photo_url || "",
          website_url: row?.website_url || "",
          calendar_url: row?.calendar_url || "",
        });
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const initials = useMemo(() => {
    const source = values.full_name || values.email || "Broker";
    return source
      .split(/\s|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "BR";
  }, [values.email, values.full_name]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved = await saveBrokerProfile(values);
      setProfile(saved);
      setValues({
        full_name: saved.full_name || "",
        company_name: saved.company_name || "",
        email: saved.email || user?.email || "",
        phone: saved.phone || "",
        profile_photo_url: saved.profile_photo_url || "",
        website_url: saved.website_url || "",
        calendar_url: saved.calendar_url || "",
      });
      setMessage("Profile saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-3xl bg-white p-8 ring-1 ring-black/[0.06]">
          <Link href="/account" className="text-[13px] font-medium uppercase tracking-[0.24em] text-black/35 hover:text-black">
            Account
          </Link>
          <h1 className="mt-3 text-[40px] font-light leading-none tracking-[-0.02em] text-black sm:text-[56px]">Profile.</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-6 text-black/50">
            Broker details are loaded from your Supabase profile record.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-3xl bg-black p-6 text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[20px] font-semibold text-black">
              {initials}
            </div>
            <h2 className="mt-5 text-[24px] font-semibold leading-tight">{values.full_name || "Profile not completed"}</h2>
            <p className="mt-1 text-[14px] text-white/55">{values.company_name || values.email || "Add your broker details"}</p>
            <div className="mt-6 rounded-2xl bg-white/10 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/40">Role</p>
              <p className="mt-1 text-[15px] text-white/75">{profile?.role || "broker"}</p>
            </div>
          </aside>

          <section className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
            {loading ? (
              <div className="rounded-2xl bg-[#f5f5f5] p-5 text-[14px] text-black/45">Loading profile...</div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
                <label className="text-[13px] font-medium text-black/55">
                  Full name
                  <input
                    type="text"
                    value={values.full_name}
                    onChange={(event) => setValues((current) => ({ ...current, full_name: event.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="text-[13px] font-medium text-black/55">
                  Company name
                  <input
                    type="text"
                    value={values.company_name}
                    onChange={(event) => setValues((current) => ({ ...current, company_name: event.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="text-[13px] font-medium text-black/55">
                  Email
                  <input
                    type="email"
                    value={values.email}
                    onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="text-[13px] font-medium text-black/55">
                  Phone
                  <input
                    type="tel"
                    value={values.phone}
                    onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="text-[13px] font-medium text-black/55">
                  Profile photo URL
                  <input
                    type="url"
                    value={values.profile_photo_url}
                    placeholder="https://..."
                    onChange={(event) => setValues((current) => ({ ...current, profile_photo_url: event.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="text-[13px] font-medium text-black/55">
                  Website URL
                  <input
                    type="url"
                    value={values.website_url}
                    placeholder="https://..."
                    onChange={(event) => setValues((current) => ({ ...current, website_url: event.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="text-[13px] font-medium text-black/55 sm:col-span-2">
                  Calendar booking URL
                  <input
                    type="url"
                    value={values.calendar_url}
                    placeholder="https://cal.com/your-link"
                    onChange={(event) => setValues((current) => ({ ...current, calendar_url: event.target.value }))}
                    className={inputClass}
                  />
                </label>
                {error || message ? (
                  <p className={`sm:col-span-2 text-[14px] ${error ? "text-red-600" : "text-black/50"}`}>
                    {error || message}
                  </p>
                ) : null}
                <div className="flex justify-end pt-2 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-black px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-35"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
