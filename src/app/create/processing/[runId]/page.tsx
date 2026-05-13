import CreateLayout from "@/components/layout/CreateLayout";
import Link from "next/link";

interface ProcessingPageProps {
  params: Promise<{ runId: string }>;
}

export default async function ProcessingPage({ params }: ProcessingPageProps) {
  const { runId } = await params;

  return (
    <CreateLayout title="Creating your PropShort" subtitle="This usually takes 1–2 minutes.">
      <div className="space-y-8">
        {/* Animated progress */}
        <div className="rounded-2xl bg-white px-8 py-12 text-center shadow-sm ring-1 ring-gray-200">
          <div className="relative mx-auto mb-6 h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
            <div className="absolute inset-3 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl">
              ✨
            </div>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Finding matches & building your package</h2>
          <p className="mt-2 text-sm text-gray-500">
            Our AI is searching for the best properties and preparing your video and PDF report.
          </p>

          {/* Progress bar */}
          <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
          </div>
        </div>

        {/* Run ID reference */}
        <p className="text-center text-xs text-gray-400">Reference: {runId}</p>

        {/* Mock: link to result */}
        <div className="rounded-xl bg-green-50 p-4 text-center text-sm text-green-700">
          <p className="font-medium">Mock: Package ready</p>
          <Link href="/packages/pkg-001" className="mt-2 inline-block font-semibold underline">
            View package →
          </Link>
        </div>
      </div>
    </CreateLayout>
  );
}
