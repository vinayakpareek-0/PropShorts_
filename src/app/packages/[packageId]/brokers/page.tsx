import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { mockInternalTraces, mockProperties } from "@/data/mock";

interface BrokersPageProps {
  params: Promise<{ packageId: string }>;
}

export default async function ListingBrokersPage({ params }: BrokersPageProps) {
  const { packageId } = await params;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link
            href={`/packages/${packageId}`}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← Back to Package
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Listing Brokers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Contact details for the property listings in this package.
          </p>
        </div>

        <div className="space-y-4">
          {mockInternalTraces.map((trace, i) => {
            const property = mockProperties[i];
            return (
              <div key={trace.id} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{property?.title ?? `Property ${i + 1}`}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span>{property?.area}, {property?.city}</span>
                      <span>·</span>
                      <span>₹{property ? (property.price / 1000000).toFixed(1) : "—"}Cr</span>
                      {trace.platform && (
                        <>
                          <span>·</span>
                          <span>{trace.platform}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {trace.listingId && (
                    <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      ID: {trace.listingId}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {trace.agentName && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Agent</dt>
                      <dd className="mt-1 text-sm font-medium text-gray-900">{trace.agentName}</dd>
                    </div>
                  )}
                  {trace.agentPhone && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={`tel:${trace.agentPhone}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                          {trace.agentPhone}
                        </a>
                      </dd>
                    </div>
                  )}
                  {trace.agentEmail && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={`mailto:${trace.agentEmail}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                          {trace.agentEmail}
                        </a>
                      </dd>
                    </div>
                  )}
                </div>

                {trace.sourceUrl && (
                  <div className="mt-4">
                    <a
                      href={trace.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-gray-400 hover:text-gray-600 underline"
                    >
                      View original listing →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
