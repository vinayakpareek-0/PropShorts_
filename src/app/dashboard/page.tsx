import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { mockPackages, mockBroker } from "@/data/mock";

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {mockBroker.fullName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new PropShort or check your recent activity.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="rounded-2xl bg-indigo-600 p-8 text-white">
          <h2 className="text-xl font-semibold">Ready to impress a client?</h2>
          <p className="mt-2 text-indigo-100">
            Turn their requirements into polished property recommendations in minutes.
          </p>
          <Link
            href="/create/select"
            className="mt-6 inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50"
          >
            + Create New PropShort
          </Link>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { href: "/propshorts", label: "My PropShorts", icon: "▶", desc: "Videos & packages" },
            { href: "/pdfs", label: "My PDFs", icon: "📄", desc: "Generated reports" },
            { href: "/tips", label: "Tips", icon: "💡", desc: "How to get best results" },
            { href: "/account", label: "Account", icon: "👤", desc: "Profile & settings" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md"
            >
              <div className="text-2xl">{item.icon}</div>
              <p className="mt-2 font-semibold text-gray-900">{item.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{item.desc}</p>
            </Link>
          ))}
        </div>

        {/* Recent packages */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Packages</h2>
            <Link href="/propshorts" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              View all
            </Link>
          </div>

          {mockPackages.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
              <p className="text-gray-500">No packages yet. Create your first PropShort above.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
              <ul className="divide-y divide-gray-100">
                {mockPackages.map((pkg) => (
                  <li key={pkg.id}>
                    <Link
                      href={`/packages/${pkg.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{pkg.packageTitle}</p>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {new Date(pkg.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <StatusBadge status={pkg.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
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
