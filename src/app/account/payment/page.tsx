import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

export default function PaymentPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/account" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            ← Account
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Payment Info</h1>
          <p className="mt-1 text-sm text-gray-500">Billing and payment method.</p>
        </div>

        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl">💳</div>
          <p className="mt-4 font-medium text-gray-600">Payment information not set up yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Payment details will appear here once billing is enabled.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
