import { MatchDetailsExperience } from "@/components/MatchDetailsExperience";

type MatchDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MatchDetailsPage({ params }: MatchDetailsPageProps) {
  const { id } = await params;
  return <MatchDetailsExperience matchId={decodeURIComponent(id)} />;
}