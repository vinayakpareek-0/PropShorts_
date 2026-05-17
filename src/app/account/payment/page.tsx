import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

export default function PaymentPage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-3xl bg-white p-8 ring-1 ring-black/[0.06]">
          <Link href="/account" className="text-[13px] font-medium uppercase tracking-[0.24em] text-black/35 hover:text-black">
            Account
          </Link>
          <h1 className="mt-3 text-[40px] font-light leading-none tracking-[-0.02em] text-black sm:text-[56px]">Payment.</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-6 text-black/50">
            Stripe is not connected yet, so no payment methods are stored for this account.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl bg-white p-6 ring-1 ring-black/[0.06]">
            <div className="rounded-3xl bg-[#f5f5f5] p-6">
              <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/35">
                Payment method
              </p>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex h-16 w-24 items-center justify-center rounded-2xl bg-black text-[13px] font-bold text-white">
                  CARD
                </div>
                <div>
                  <p className="text-[20px] font-semibold text-black">No card on file</p>
                  <p className="mt-1 text-[14px] text-black/45">The Starter plan is visible for testing, but checkout is disabled until Stripe is integrated.</p>
                </div>
              </div>
            </div>

            <button className="mt-5 rounded-xl bg-black px-5 py-3 text-[14px] font-semibold text-white opacity-35" disabled>
              Add Payment Method Later
            </button>
          </section>

          <aside className="rounded-3xl bg-[#c8cc7c] p-6 text-black">
            <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-black/45">Current billing state</p>
            <h2 className="mt-3 text-[24px] font-semibold leading-tight">Payments are not active.</h2>
            <p className="mt-3 text-[14px] leading-6 text-black/60">
              No mock card or invoice data is shown here. Once Stripe is added, this page should read the customer and payment method records.
            </p>
            <Link
              href="/account/subscription"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-black px-4 text-[14px] font-semibold text-white transition-opacity hover:opacity-80"
            >
              View Plan
            </Link>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
