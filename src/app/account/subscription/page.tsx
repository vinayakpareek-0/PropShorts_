import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

export default function SubscriptionPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/account" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            ← Account
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="mt-1 text-sm text-gray-500">Your current plan and usage.</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700">
                Starter Plan
              </span>
              <p className="mt-3 text-2xl font-bold text-gray-900">Free</p>
              <p className="mt-1 text-sm text-gray-500">Your current plan</p>
            </div>
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              Upgrade Plan
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-500">PropShorts used</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">3 / 5</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-500">PDFs generated</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">3 / 10</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-6 text-center">
          <p className="font-medium text-indigo-700">Subscription billing is coming soon.</p>
          <p className="mt-1 text-sm text-indigo-500">
            Upgrade options will appear here once billing is enabled.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
