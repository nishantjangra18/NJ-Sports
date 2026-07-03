import { HighlightPlayerExperience } from "@/components/HighlightPlayerExperience";

export default async function UefaChampionsLeagueHighlightPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <HighlightPlayerExperience slug={slug} />;
}