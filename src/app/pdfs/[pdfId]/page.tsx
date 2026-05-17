import PdfViewerClient from "./PdfViewerClient";

interface PdfViewerPageProps {
  params: Promise<{ pdfId: string }>;
}

export default async function PdfViewerPage({ params }: PdfViewerPageProps) {
  const { pdfId } = await params;

  return <PdfViewerClient pdfId={pdfId} />;
}
