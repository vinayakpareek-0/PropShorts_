import CreateLayout from "@/components/layout/CreateLayout";
import Link from "next/link";

export default function CreateWritePage() {
  return (
    <CreateLayout
      title="Describe the client requirement"
      subtitle="Type what your client is looking for. Be as specific as possible."
      step={2}
      totalSteps={4}
    >
      <div className="space-y-6">
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="p-4 pb-2">
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">
              Client name
            </label>
            <input
              id="clientName"
              type="text"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. John Smith"
            />
          </div>
          <div className="p-4 pt-2">
            <label htmlFor="requirement" className="block text-sm font-medium text-gray-700">
              Property requirement
            </label>
            <textarea
              id="requirement"
              rows={8}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              placeholder="e.g. Looking for a 3BHK apartment in Bandra, Mumbai. Budget around 1.5 Cr. Client prefers a society with parking and gym. For end use."
            />
          </div>
        </div>

        {/* Tips */}
        <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
          <p className="font-medium">Tips for better results:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-amber-600">
            <li>Include the location and budget</li>
            <li>Mention property type and size (BHK)</li>
            <li>Note if it&apos;s for buying or renting</li>
            <li>Add any specific amenity requirements</li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/create/select" className="text-sm font-medium text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <div className="flex gap-3">
            <Link
              href="/create/talk"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Use voice instead
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
