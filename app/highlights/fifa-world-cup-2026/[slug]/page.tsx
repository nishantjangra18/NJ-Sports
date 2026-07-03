import { HighlightPlayerExperience } from "@/components/HighlightPlayerExperience";

type HighlightPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function HighlightPage({ params }: HighlightPageProps) {
  const { slug } = await params;
  return <HighlightPlayerExperience slug={decodeURIComponent(slug)} />;
}
