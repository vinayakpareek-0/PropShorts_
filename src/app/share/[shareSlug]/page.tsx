import { mockPackageDetail } from "@/data/mock";

interface SharePageProps {
  params: Promise<{ shareSlug: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareSlug } = await params;
  const pkg = mockPackageDetail;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal public header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              PS
            </div>
            <span className="font-semibold text-gray-900">PropShorts</span>
          </div>
          <p className="text-xs text-gray-400">Shared property recommendation</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="space-y-8">
          {/* Package header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pkg.packageTitle}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Shared via PropShorts · {new Date(pkg.createdAt).toLocaleDateString("en-IN")}
            </p>
          </div>

          {/* Properties */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Property Recommendations</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {pkg.properties.map((property) => (
                <div key={property.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                  <div className="flex h-36 items-center justify-center bg-gray-100 text-4xl text-gray-400">
                    🏠
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-gray-900 line-clamp-1">{property.title}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{property.area}, {property.city}</p>
                    <p className="mt-1 text-sm font-medium text-indigo-600">
                      ₹{(property.price / 1000000).toFixed(1)}Cr
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {property.highlights.slice(0, 3).map((h) => (
                        <span key={h} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PDF CTA */}
          {pkg.pdf && (
            <div className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
              <div className="flex items-center gap-4">
                <div className="text-3xl">📄</div>
                <div>
                  <p className="font-semibold text-gray-900">PDF Report</p>
                  <p className="text-sm text-gray-500">Full property details and recommendations</p>
                </div>
              </div>
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                Download PDF
              </button>
            </div>
          )}

          <p className="text-center text-xs text-gray-400">Share slug: {shareSlug}</p>
        </div>
      </main>
    </div>
  );
}
