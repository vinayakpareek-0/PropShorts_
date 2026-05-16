import PackagePageClient from "./PackagePageClient";

interface PackagePageProps {
  params: Promise<{ packageId: string }>;
}

export default async function PackagePage({ params }: PackagePageProps) {
  const { packageId } = await params;

  return <PackagePageClient packageId={packageId} />;
}
