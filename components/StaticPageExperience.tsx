import { Shell } from "@/components/Shell";

export function StaticPageExperience({ title, message }: { title: string; message: string }) {
  return (
    <Shell>
      <section className="px-5 pb-12 pt-8 sm:px-8 lg:px-10">
        <div className="rounded-[22px] border border-white/10 bg-studio-card px-5 py-8">
          <h1 className="text-2xl font-semibold tracking-normal text-white">{title}</h1>
          <p className="mt-2 text-sm text-studio-muted">{message}</p>
        </div>
      </section>
    </Shell>
  );
}
