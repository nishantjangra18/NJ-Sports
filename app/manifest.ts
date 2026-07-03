import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: "#070707",
    theme_color: "#070707",
    icons: [
      {
        src: brand.logoSrc,
        sizes: "any",
        type: "image/png",
        purpose: "any"
      },
      {
        src: brand.logoSrc,
        sizes: "any",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
