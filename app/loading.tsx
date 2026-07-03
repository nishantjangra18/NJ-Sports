import Image from "next/image";
import { brand } from "@/lib/brand";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-studio-bg">
      <div className="flex flex-col items-center gap-5">
        <Image
          src={brand.logoSrc}
          alt={brand.logoAlt}
          width={120}
          height={120}
          priority
          className="h-20 w-20 object-contain"
        />
        <div className="h-1 w-44 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-studio-accent" />
        </div>
      </div>
    </main>
  );
}
