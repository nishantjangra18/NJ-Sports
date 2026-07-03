import { PlayerExperience } from "@/components/PlayerExperience";

type PlayerPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function WatchPage({ params }: PlayerPageProps) {
  const { slug } = await params;
  return <PlayerExperience slug={decodeURIComponent(slug)} />;
}
