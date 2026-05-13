import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";

interface PropshortViewerPageProps {
  params: Promise<{ propshortId: string }>;
}

export default async function PropshortViewerPage({ params }: PropshortViewerPageProps) {
  const { propshortId } = await params;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/propshorts" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
            ← My PropShorts
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">PropShort Viewer</h1>
        </div>

        {/* Video player placeholder */}
        <div className="overflow-hidden rounded-2xl bg-black">
          <div className="flex h-96 items-center justify-center text-white">
            <div className="text-center">
              <div className="mb-4 text-6xl">▶</div>
              <p className="text-lg font-medium">Video player</p>
              <p className="mt-1 text-sm text-gray-400">PropShort ID: {propshortId}</p>
            </div>
          </div>
        </div>

        {/* Properties in this propshort */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <h2 className="mb-4 font-semibold text-gray-900">Placeholder — Video details</h2>
          <p className="text-sm text-gray-500">
            This page will show the video player and property details for PropShort{" "}
            <span className="font-mono text-xs text-gray-700">{propshortId}</span>.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
