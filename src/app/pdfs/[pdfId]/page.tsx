import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

interface PdfViewerPageProps {
  params: Promise<{ pdfId: string }>;
}

export default async function PdfViewerPage({ params }: PdfViewerPageProps) {
  const { pdfId } = await params;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/pdfs" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            ← My PDFs
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">PDF Viewer</h1>
        </div>

        {/* PDF preview placeholder */}
        <div className="overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-gray-200">
          <div className="flex h-[600px] items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-6xl">📄</div>
              <p className="text-lg font-medium text-gray-600">PDF preview</p>
              <p className="mt-1 text-sm text-gray-400">PDF ID: {pdfId}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Download PDF
          </button>
          <button className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            Share PDF
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
