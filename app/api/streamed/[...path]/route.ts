import { NextRequest, NextResponse } from "next/server";
import https from "node:https";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STREAMED_API_BASE_URL = process.env.NEXT_PUBLIC_STREAMED_API_BASE_URL ?? "https://streamed.pk/api";
const allowedRoots = new Set(["matches", "stream"]);
const dnsCache = new Map<string, { address: string; expiresAt: number }>();
const resilientMatchPaths = new Set(["matches/live", "matches/all-today", "matches/all"]);
const responseCache = new Map<string, { body: unknown[]; expiresAt: number; updatedAt: number }>();
const circuitState = new Map<string, { failures: number; openUntil: number }>();

const liveCacheTtlMs = 15_000;
const matchCacheTtlMs = 30_000;
const upstreamTimeoutMs = 5_000;
const retryDelaysMs = [0, 300, 800];
const circuitOpenMs = 30_000;

type DnsAnswer = {
  Answer?: Array<{ type?: number; data?: string; TTL?: number }>;
};

async function resolveHost(hostname: string): Promise<{ address: string; family: 4 }> {
  const cached = dnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return { address: cached.address, family: 4 };

  const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
    headers: { Accept: "application/dns-json" },
    cache: "no-store"
  });

  if (!response.ok) throw new Error("Unable to resolve streamed host");

  const data = (await response.json()) as DnsAnswer;
  const answer = data.Answer?.find((item) => item.type === 1 && item.data);
  if (!answer?.data) throw new Error("No streamed host address found");

  dnsCache.set(hostname, {
    address: answer.data,
    expiresAt: Date.now() + Math.max(30, answer.TTL ?? 60) * 1000
  });

  return { address: answer.data, family: 4 };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheTtlFor(pathKey: string) {
  return pathKey === "matches/live" ? liveCacheTtlMs : matchCacheTtlMs;
}

function dataArrayFromJson(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "object" || value === null) return [];
  const record = value as Record<string, unknown>;
  const candidates = [record.data, record.matches, record.results, record.sports];
  const found = candidates.find(Array.isArray);
  return Array.isArray(found) ? found : [];
}

function safeMatchResponse(pathKey: string, data: unknown[], fallback: boolean, message: string) {
  return NextResponse.json(
    {
      success: true,
      data,
      fallback,
      message
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "x-streamed-path": pathKey,
        "x-streamed-fallback": String(fallback)
      }
    }
  );
}

async function fetchWithResolvedDns(url: string, timeoutMs = upstreamTimeoutMs): Promise<{ body: Buffer; status: number; contentType: string }> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          Origin: "https://streamed.pk",
          Referer: "https://streamed.pk/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
        },
        lookup(hostname, options, callback) {
          resolveHost(hostname)
            .then(({ address, family }) => {
              if (options.all) callback(null, [{ address, family }]);
              else callback(null, address, family);
            })
            .catch((error) => callback(error, "", 4));
        },
        timeout: timeoutMs
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks),
            status: response.statusCode ?? 502,
            contentType: response.headers["content-type"]?.toString() ?? "application/json"
          });
        });
      }
    );

    request.on("timeout", () => request.destroy(new Error("Streamed request timed out")));
    request.on("error", reject);
    request.end();
  });
}

async function fetchJsonWithRetries(url: string): Promise<unknown> {
  let lastError: unknown;

  for (let index = 0; index < retryDelaysMs.length; index += 1) {
    const delay = retryDelaysMs[index];
    if (delay > 0) await sleep(delay);

    try {
      const response = await fetchWithResolvedDns(url);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Streamed upstream returned ${response.status}`);
      }

      if (!response.contentType.includes("application/json")) {
        throw new Error("Streamed upstream returned non-JSON data");
      }

      return JSON.parse(response.body.toString("utf8")) as unknown;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to load streamed data");
}

async function getResilientMatches(pathKey: string, targetUrl: string) {
  const now = Date.now();
  const cached = responseCache.get(pathKey);
  if (cached && cached.expiresAt > now) {
    return safeMatchResponse(pathKey, cached.body, false, "cached data used");
  }

  const circuit = circuitState.get(pathKey);
  if (circuit && circuit.openUntil > now) {
    return safeMatchResponse(pathKey, cached?.body ?? [], true, cached ? "cached data used" : "live data temporarily unavailable");
  }

  try {
    const json = await fetchJsonWithRetries(targetUrl);
    const data = dataArrayFromJson(json);
    const refreshedAt = Date.now();
    responseCache.set(pathKey, {
      body: data,
      expiresAt: refreshedAt + cacheTtlFor(pathKey),
      updatedAt: refreshedAt
    });
    circuitState.set(pathKey, { failures: 0, openUntil: 0 });
    return safeMatchResponse(pathKey, data, false, "live data");
  } catch {
    const current = circuitState.get(pathKey) ?? { failures: 0, openUntil: 0 };
    const failures = current.failures + 1;
    circuitState.set(pathKey, {
      failures,
      openUntil: failures >= 3 ? Date.now() + circuitOpenMs : 0
    });

    return safeMatchResponse(pathKey, cached?.body ?? [], true, cached ? "cached data used" : "live data temporarily unavailable");
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const params = await context.params;
  const pathParts = params.path ?? [];

  if (pathParts.length === 0 || !allowedRoots.has(pathParts[0])) {
    return NextResponse.json({ error: "Unsupported streamed endpoint" }, { status: 404 });
  }

  const targetUrl = `${STREAMED_API_BASE_URL.replace(/\/+$/, "")}/${pathParts.map(encodeURIComponent).join("/")}`;
  const pathKey = pathParts.join("/");

  if (resilientMatchPaths.has(pathKey)) {
    return getResilientMatches(pathKey, targetUrl);
  }

  try {
    const response = await fetchWithResolvedDns(targetUrl);

    return new NextResponse(new Uint8Array(response.body), {
      status: response.status,
      headers: {
        "content-type": response.contentType,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load streamed data";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
