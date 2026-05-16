import PackagePageClient from "./PackagePageClient";

interface PackagePageProps {
  params: Promise<{ packageId: string }>;
}

export function generateStaticParams() {
  return [{ packageId: "pkg-001" }, { packageId: "pkg-002" }, { packageId: "pkg-003" }];
}

export default async function PackagePage({ params }: PackagePageProps) {
  const { packageId } = await params;

  return <PackagePageClient packageId={packageId} />;
}
