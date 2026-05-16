import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

const passwordInputClass =
  "mt-2 block w-full rounded-2xl border border-black/[0.06] bg-[#f5f5f5] px-4 py-3 text-[14px] text-black outline-none transition-shadow placeholder:text-black/25 focus:ring-2 focus:ring-black/10";

export default function SecurityPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-3xl bg-white p-8 ring-1 ring-black/[0.06]">
          <Link href="/account" className="text-[13px] font-medium uppercase tracking-[0.24em] text-black/35 hover:text-black">
            Account
          </Link>
          <h1 className="mt-3 text-[40px] font-light leading-none tracking-[-0.02em] text-black sm:text-[56px]">Security.</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-6 text-black/50">
            Manage sign-in details and account-level controls. These actions are frontend-only for now.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
            <div className="mb-5">
              <h2 className="text-[24px] font-semibold text-black">Change password</h2>
              <p className="mt-1 text-[14px] text-black/45">Use a strong password you do not reuse elsewhere.</p>
            </div>
            <form className="grid gap-5">
              <label className="text-[13px] font-medium text-black/55">
                Current password
                <input type="password" className={passwordInputClass} placeholder="Enter current password" />
              </label>
              <label className="text-[13px] font-medium text-black/55">
                New password
                <input type="password" className={passwordInputClass} placeholder="Enter new password" />
              </label>
              <label className="text-[13px] font-medium text-black/55">
                Confirm new password
                <input type="password" className={passwordInputClass} placeholder="Confirm new password" />
              </label>
              <div className="flex justify-end pt-1">
                <button type="submit" className="rounded-xl bg-black px-5 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-80">
                  Update Password
                </button>
              </div>
            </form>
          </section>

          <aside className="flex flex-col gap-5">
            <div className="rounded-3xl bg-[#f5f5f5] p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">Session</p>
              <p className="mt-3 text-[20px] font-semibold text-black">Signed in as broker</p>
              <p className="mt-2 text-[13px] leading-5 text-black/45">Real session controls will be connected with Supabase Auth later.</p>
            </div>

            <div className="rounded-3xl border border-black/[0.06] bg-white p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">Account removal</p>
              <p className="mt-3 text-[18px] font-semibold text-black">Delete account</p>
              <p className="mt-2 text-[13px] leading-5 text-black/45">Disabled until backend data ownership and confirmation flows are implemented.</p>
              <button className="mt-5 rounded-xl border border-black/10 px-4 py-3 text-[14px] font-semibold text-black/35" disabled>
                Unavailable
              </button>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
