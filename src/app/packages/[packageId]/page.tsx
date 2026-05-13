import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { mockPackageDetail } from "@/data/mock";

interface PackagePageProps {
  params: Promise<{ packageId: string }>;
}

export default async function PackagePage({ params }: PackagePageProps) {
  const { packageId } = await params;
  const pkg = mockPackageDetail;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/propshorts" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              ← My PropShorts
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{pkg.packageTitle}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Created {new Date(pkg.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/packages/${packageId}/brokers`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Listing Brokers
            </Link>
            <button className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              Share Package
            </button>
          </div>
        </div>

        {/* Videos */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">PropShort Videos</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {pkg.properties.map((property, i) => (
              <div key={property.id} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
                <div className="flex h-40 items-center justify-center bg-gray-100 text-4xl text-gray-400">
                  ▶
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 line-clamp-1">{property.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{property.area}, {property.city}</p>
                  <p className="mt-1 text-sm font-medium text-indigo-600">
                    ₹{(property.price / 1000000).toFixed(1)}Cr
                  </p>
                  <Link
                    href={`/propshorts/${pkg.id}-prop-${i + 1}`}
                    className="mt-3 block text-center rounded-lg bg-gray-100 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Watch Video
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PDF */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">PDF Report</h2>
          <div className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-2xl">
                📄
              </div>
              <div>
                <p className="font-semibold text-gray-900">{pkg.packageTitle}</p>
                <p className="text-sm text-gray-500">PDF Report · 3 properties</p>
              </div>
            </div>
            <Link
              href={`/pdfs/${pkg.pdfId}`}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Open PDF
            </Link>
          </div>
        </div>

        {/* Reference */}
        <p className="text-xs text-gray-400">Package ID: {packageId}</p>
      </div>
    </AppLayout>
  );
}
