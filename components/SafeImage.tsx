"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";

const defaultFallbackSrc = "/brand/football-placeholder.svg";
const youtubeHosts = new Set(["i.ytimg.com", "img.youtube.com", "ytimg.com"]);

type SafeImageProps = ImageProps & {
  fallbackSrc?: string;
};

function unwrapYouTubeProxySrc(src: ImageProps["src"]): ImageProps["src"] {
  if (typeof src !== "string" || !src.startsWith("/api/images/proxy/")) return src;
  const encoded = src.replace("/api/images/proxy/", "");
  try {
    const decoded = decodeURIComponent(encoded);
    const url = new URL(decoded);
    if (youtubeHosts.has(url.hostname) || url.hostname.endsWith(".ytimg.com")) return decoded;
  } catch {
    return src;
  }
  return src;
}

export function SafeImage({ src, fallbackSrc = defaultFallbackSrc, alt, onError, ...props }: SafeImageProps) {
  const normalizedSrc = useMemo(() => unwrapYouTubeProxySrc(src), [src]);
  const [currentSrc, setCurrentSrc] = useState(normalizedSrc);

  useEffect(() => {
    setCurrentSrc(normalizedSrc);
  }, [normalizedSrc]);

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={(event) => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
        onError?.(event);
      }}
    />
  );
}