import ProcessingPageClient from "./ProcessingPageClient";

interface ProcessingPageProps {
  params: Promise<{ runId: string }>;
}

export default async function ProcessingPage({ params }: ProcessingPageProps) {
  await params;

  return <ProcessingPageClient />;
}
