import PropshortViewerClient from "./PropshortViewerClient";

interface PropshortViewerPageProps {
  params: Promise<{ propshortId: string }>;
}

export default async function PropshortViewerPage({ params }: PropshortViewerPageProps) {
  const { propshortId } = await params;

  return <PropshortViewerClient propshortId={propshortId} />;
}
