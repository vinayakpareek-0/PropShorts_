import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { mockPackages } from "@/data/mock";

export default function PropShortsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My PropShorts</h1>
            <p className="mt-1 text-sm text-gray-500">All your generated property video packages.</p>
          </div>
          <Link
            href="/create/select"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            + New PropShort
          </Link>
        </div>

        {mockPackages.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
            <p className="text-lg font-medium text-gray-500">No PropShorts yet</p>
            <p className="mt-1 text-sm text-gray-400">Create your first one to get started.</p>
            <Link
              href="/create/select"
              className="mt-4 inline-flex rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Create PropShort
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Client / Package", "Date", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockPackages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{pkg.packageTitle}</p>
                      <p className="text-xs text-gray-400">ID: {pkg.id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(pkg.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={pkg.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <Link
                          href={`/packages/${pkg.id}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          View
                        </Link>
                        <Link
                          href={`/packages/${pkg.id}/brokers`}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          Brokers
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-50 text-green-700 ring-green-600/20",
    processing: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
    failed: "bg-red-50 text-red-700 ring-red-600/20",
    draft: "bg-gray-50 text-gray-700 ring-gray-600/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset capitalize ${styles[status] ?? styles.draft}`}
    >
      {status}
    </span>
  );
}
