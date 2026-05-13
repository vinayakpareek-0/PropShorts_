import CreateLayout from "@/components/layout/CreateLayout";
import Link from "next/link";
import { mockRequirement } from "@/data/mock";

export default function CreateConfirmPage() {
  const req = mockRequirement.refinedRequirementsJson;

  return (
    <CreateLayout
      title="Confirm requirement"
      subtitle="Review and edit the AI-interpreted requirement before generating."
      step={3}
      totalSteps={4}
    >
      <div className="space-y-6">
        {/* AI summary card */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs text-indigo-600">
                AI
              </span>
              <p className="text-sm font-medium text-gray-700">AI-interpreted requirement</p>
            </div>
          </div>
          <div className="px-6 py-4">
            <p className="mb-4 font-semibold text-gray-900">
              Client: {mockRequirement.clientName}
            </p>
            {req && (
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {[
                  { label: "Location", value: req.location },
                  { label: "Budget", value: `₹${(req.budget / 1000000).toFixed(1)}Cr` },
                  { label: "Property type", value: req.propertyType },
                  { label: "Bedrooms", value: req.bedrooms?.toString() ?? "—" },
                  { label: "Bathrooms", value: req.bathrooms?.toString() ?? "—" },
                  { label: "Purpose", value: req.purpose },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900 capitalize">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {req?.additionalNotes && (
              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {req.additionalNotes}
              </div>
            )}
          </div>
        </div>

        {/* Edit note */}
        <p className="text-sm text-gray-500">
          Not quite right?{" "}
          <button className="font-medium text-indigo-600 hover:text-indigo-500">
            Edit requirement
          </button>
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href="/create/write" className="text-sm font-medium text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <Link
            href="/create/processing/run-001"
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Generate →
          </Link>
        </div>
      </div>
    </CreateLayout>
  );
}
