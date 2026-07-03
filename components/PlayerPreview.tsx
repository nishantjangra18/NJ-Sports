"use client";

import { SafeImage } from "@/components/SafeImage";
import Link from "next/link";
import { Maximize, PictureInPicture, Play, Settings, Volume2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { playerSettings } from "@/data/content";
import type { MatchCardView } from "@/services/api/types";

export function PlayerPreview({ match }: { match?: MatchCardView }) {
  const playerImage = match?.thumbnail ?? match?.image ?? "/brand/nj-sports-logo.png";
  const playButton = (
    <button
      type="button"
      aria-label="Play preview"
      className="grid h-20 w-20 place-items-center rounded-full bg-white text-black shadow-premium transition hover:scale-105"
    >
      <Play className="h-8 w-8 fill-black" />
    </button>
  );

  return (
    <section className="px-5 py-8 sm:px-8 lg:px-10">
      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.85fr]">
        <div className="relative aspect-video overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-premium">
          <SafeImage
            src={playerImage}
            alt={match?.title ?? "Premium sports player preview"}
            fill
            unoptimized
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/20" />
          <div className="absolute left-5 top-5">
            <BrandLogo showName={false} imageClassName="h-12 w-12" />
          </div>
          <div className="absolute inset-0 grid place-items-center">
            {match?.href ? <Link href={match.href}>{playButton}</Link> : playButton}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/14">
              <div className="h-full w-[42%] rounded-full bg-studio-accent" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {[Play, Volume2, PictureInPicture, Settings].map((Icon, index) => (
                  <span
                    key={index}
                    aria-hidden="true"
                    className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white backdrop-blur transition hover:bg-white/18"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                ))}
              </div>
              <span
                aria-hidden="true"
                className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white backdrop-blur transition hover:bg-white/18"
              >
                <Maximize className="h-5 w-5" />
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-5 shadow-premium backdrop-blur-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-studio-muted">Player Settings</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-normal text-white">Streaming controls stay inside the player.</h2>
          <div className="mt-6 space-y-3">
            {playerSettings.map((setting) => {
              const Icon = setting.icon;
              return (
                <div key={setting.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium text-white">{setting.label}</span>
                  </div>
                  <span className="text-sm text-studio-muted">{setting.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
