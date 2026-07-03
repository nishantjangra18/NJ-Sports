import Image from "next/image";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  showName?: boolean;
  priority?: boolean;
};

export function BrandLogo({ className, imageClassName, showName = true, priority = false }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src={brand.logoSrc}
        alt={brand.logoAlt}
        width={96}
        height={96}
        priority={priority}
        className={cn("h-11 w-11 shrink-0 object-contain", imageClassName)}
      />
      {showName ? <span className="text-base font-semibold tracking-normal text-white">{brand.name}</span> : null}
    </div>
  );
}
