import CreateLayout from "@/components/layout/CreateLayout";
import Link from "next/link";

export default function CreateTalkPage() {
  return (
    <CreateLayout
      title="Tell me about the client"
      subtitle="Speak or upload a voice note describing what your client is looking for."
      step={2}
      totalSteps={4}
    >
      <div className="space-y-6">
        {/* Listening orb area */}
        <div className="flex flex-col items-center rounded-2xl bg-white py-16 shadow-sm ring-1 ring-gray-200">
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-indigo-100">
            <div className="absolute inset-0 animate-ping rounded-full bg-indigo-200 opacity-50" />
            <div className="relative h-20 w-20 rounded-full bg-indigo-600 flex items-center justify-center text-3xl text-white">
              🎤
            </div>
          </div>
          <p className="mt-6 text-lg font-medium text-gray-700">Tap to start recording</p>
          <p className="mt-1 text-sm text-gray-400">Describe the client&apos;s property requirement</p>
        </div>

        {/* Upload alternative */}
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-indigo-400">
          <p className="text-sm font-medium text-gray-600">Or upload a voice note</p>
          <p className="mt-1 text-xs text-gray-400">MP3, M4A, WAV up to 25MB</p>
          <button className="mt-3 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
            Choose file
          </button>
        </div>

        {/* Helper text */}
        <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-700">
          <p className="font-medium">What to describe:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-indigo-600">
            <li>Client&apos;s name</li>
            <li>Location preference</li>
            <li>Budget range</li>
            <li>Property type and size</li>
            <li>Any specific requirements</li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/create/select" className="text-sm font-medium text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <div className="flex gap-3">
            <Link
              href="/create/write"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Type instead
            </Link>
            <Link
              href="/create/confirm"
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Continue →
            </Link>
          </div>
        </div>
      </div>
    </CreateLayout>
  );
}
