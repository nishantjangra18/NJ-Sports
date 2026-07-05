import { HighlightPlayerExperience } from "@/components/HighlightPlayerExperience";

export default async function Mls2026HighlightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <HighlightPlayerExperience slug={slug} />;
}
