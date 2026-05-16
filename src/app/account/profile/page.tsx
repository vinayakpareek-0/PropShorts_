import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { mockBroker } from "@/data/mock";

const inputClass =
  "mt-2 block w-full rounded-2xl border border-black/[0.06] bg-[#f5f5f5] px-4 py-3 text-[14px] text-black outline-none transition-shadow focus:ring-2 focus:ring-black/10";

export default function ProfilePage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-3xl bg-white p-8 ring-1 ring-black/[0.06]">
          <Link href="/account" className="text-[13px] font-medium uppercase tracking-[0.24em] text-black/35 hover:text-black">
            Account
          </Link>
          <h1 className="mt-3 text-[40px] font-light leading-none tracking-[-0.02em] text-black sm:text-[56px]">Profile.</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-6 text-black/50">
            Keep the broker details clients will see in future packages and reports.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-3xl bg-black p-6 text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[20px] font-semibold text-black">
              RM
            </div>
            <h2 className="mt-5 text-[24px] font-semibold leading-tight">{mockBroker.fullName}</h2>
            <p className="mt-1 text-[14px] text-white/55">{mockBroker.companyName}</p>
            <div className="mt-6 rounded-2xl bg-white/10 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-white/40">Role</p>
              <p className="mt-1 text-[15px] text-white/75">Broker</p>
            </div>
          </aside>

          <section className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
            <form className="grid gap-5 sm:grid-cols-2">
              <label className="text-[13px] font-medium text-black/55">
                Full name
                <input type="text" defaultValue={mockBroker.fullName} className={inputClass} />
              </label>
              <label className="text-[13px] font-medium text-black/55">
                Company name
                <input type="text" defaultValue={mockBroker.companyName} className={inputClass} />
              </label>
              <label className="text-[13px] font-medium text-black/55">
                Email
                <input type="email" defaultValue={mockBroker.email} className={inputClass} />
              </label>
              <label className="text-[13px] font-medium text-black/55">
                Phone
                <input type="tel" defaultValue={mockBroker.phone} className={inputClass} />
              </label>
              <div className="sm:col-span-2 flex justify-end pt-2">
                <button type="submit" className="rounded-xl bg-black px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-80">
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
