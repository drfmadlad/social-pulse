import type { VercelRequest } from "./vercelTypes.js";

// Soft, per-instance limit — see docs/adr/0001-in-memory-rate-limiting-for-ai-proxy.md for why
// this doesn't span serverless instances, and why that's an acceptable trade-off here.
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 20;

interface RequestWindow {
  count: number;
  resetAt: number;
}

const windowsByClient = new Map<string, RequestWindow>();

// Distinct callers accumulate here for as long as the instance stays warm, so expired windows
// need reclaiming or the map grows without bound. A full-map sweep is O(n), so it's throttled to
// once per window instead of running on every call.
let lastSweepAt = 0;

function sweepExpiredWindows(now: number): void {
  if (now - lastSweepAt < RATE_LIMIT_WINDOW_MS) return;
  lastSweepAt = now;

  for (const [key, window] of windowsByClient) {
    if (now >= window.resetAt) {
      windowsByClient.delete(key);
    }
  }
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(clientKey: string, now: number = Date.now()): RateLimitDecision {
  sweepExpiredWindows(now);

  const existing = windowsByClient.get(clientKey);

  if (!existing || now >= existing.resetAt) {
    windowsByClient.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientKey(req: VercelRequest): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const forwardedIp = firstForwarded?.split(",")[0]?.trim();

  return forwardedIp || req.socket?.remoteAddress || "unknown";
}

export function _resetRateLimiterForTests(): void {
  windowsByClient.clear();
  lastSweepAt = 0;
}

export function _getTrackedClientCountForTests(): number {
  return windowsByClient.size;
}
