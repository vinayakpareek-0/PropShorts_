import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

export default function SecurityPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/account" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            ← Account
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Security</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your password and account security.</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 font-semibold text-gray-900">Change password</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Current password</label>
              <input
                type="password"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">New password</label>
              <input
                type="password"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
              <input
                type="password"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Update password
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-2 font-semibold text-gray-900">Danger zone</h2>
          <p className="text-sm text-gray-500">Permanently delete your account and all data.</p>
          <button className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            Delete account
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
