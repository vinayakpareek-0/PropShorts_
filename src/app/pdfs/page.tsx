import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { mockPackages } from "@/data/mock";

export default function PdfsPage() {
  const pdfsPackages = mockPackages.filter((pkg) => pkg.pdfId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My PDFs</h1>
            <p className="mt-1 text-sm text-gray-500">All your generated property PDF reports.</p>
          </div>
          <Link
            href="/create/select"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            + New Report
          </Link>
        </div>

        {pdfsPackages.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-16 text-center">
            <p className="text-lg font-medium text-gray-500">No PDF reports yet</p>
            <p className="mt-1 text-sm text-gray-400">Create your first PropShort to generate a report.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Report", "Date", "Package", "Actions"].map((h) => (
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
                {pdfsPackages.map((pkg) => (
                  <tr key={pkg.pdfId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-xl">
                          📄
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{pkg.packageTitle}</p>
                          <p className="text-xs text-gray-400">3 properties</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(pkg.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/packages/${pkg.id}`}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700"
                      >
                        View package
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <Link
                          href={`/pdfs/${pkg.pdfId}`}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          Open PDF
                        </Link>
                        <button className="text-sm font-medium text-gray-500 hover:text-gray-700">
                          Share
                        </button>
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
