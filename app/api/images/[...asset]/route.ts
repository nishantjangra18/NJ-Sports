import { NextResponse, type NextRequest } from "next/server";
import { STREAMED_API_BASE_URL } from "@/services/api/streamed";

export const dynamic = "force-dynamic";

const placeholderPath = "/brand/football-placeholder.svg";
const cacheHeader = "public, max-age=86400, stale-while-revalidate=604800";

function placeholderRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL(placeholderPath, request.url), 307);
}

function decodeAsset(parts: string[]) {
  return parts.map((part) => decodeURIComponent(part)).join("/");
}

function proxiedUrlFromParts(parts: string[]) {
  const raw = decodeAsset(parts);
  if (/^https?:\/\//i.test(raw)) return raw;
  return undefined;
}

function streamedImageUrl(parts: string[]) {
  const cleanPath = parts.map((part) => encodeURIComponent(decodeURIComponent(part))).join("/");
  return `${STREAMED_API_BASE_URL.replace(/\/+$/, "")}/images/${cleanPath}`;
}

async function fetchImage(url: string) {
  return fetch(url, {
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*,*/*" },
    cache: "no-store"
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ asset?: string[] }> }) {
  const { asset = [] } = await params;
  if (asset.length === 0) return placeholderRedirect(request);

  const targetUrl = asset[0] === "proxy" ? proxiedUrlFromParts(asset.slice(1)) : streamedImageUrl(asset);
  if (!targetUrl) return placeholderRedirect(request);

  try {
    const response = await fetchImage(targetUrl);
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.toLowerCase().startsWith("image/")) return placeholderRedirect(request);

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": cacheHeader
      }
    });
  } catch {
    return placeholderRedirect(request);
  }
}