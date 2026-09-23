import type { VercelRequest } from "./vercelTypes.js";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseOrigin(value: string | undefined): URL | null {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

// VERCEL_ENV is "production" or "preview" on every real deployment and only "development" (or
// unset, for a plain local `vitest`/Node run) under `vercel dev`. Gating the localhost allowance
// on it stops a non-browser caller from just sending `Origin: http://localhost` to a live
// deployment to skip the origin check entirely.
function isLocalDevEnvironment(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  return vercelEnv === undefined || vercelEnv === "development";
}

export function isAllowedOrigin(req: VercelRequest): boolean {
  const origin =
    parseOrigin(firstHeaderValue(req.headers.origin)) ?? parseOrigin(firstHeaderValue(req.headers.referer));

  if (!origin) return false;
  if (isLocalDevEnvironment() && LOCAL_HOSTNAMES.has(origin.hostname)) return true;

  const host = firstHeaderValue(req.headers.host);
  return host !== undefined && origin.host === host;
}
