import type { VercelRequest } from "./vercelTypes.js";
import { beforeEach, describe, expect, it } from "vitest";
import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  _getTrackedClientCountForTests,
  _resetRateLimiterForTests,
  checkRateLimit,
  getClientKey,
} from "./rateLimiter.js";

beforeEach(() => {
  _resetRateLimiterForTests();
});

describe("checkRateLimit", () => {
  it("allows requests up to the per-window limit", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      expect(checkRateLimit("client-a").allowed).toBe(true);
    }
  });

  it("rejects the request after the limit is exceeded within the window", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit("client-b");
    }

    const decision = checkRateLimit("client-b");

    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the count once the window has elapsed", () => {
    const start = 0;
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit("client-c", start);
    }

    expect(checkRateLimit("client-c", start).allowed).toBe(false);
    expect(checkRateLimit("client-c", start + 60_001).allowed).toBe(true);
  });

  it("tracks separate windows per client key", () => {
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit("client-d");
    }

    expect(checkRateLimit("client-d").allowed).toBe(false);
    expect(checkRateLimit("client-e").allowed).toBe(true);
  });

  it("evicts expired windows on a later call instead of growing the map forever", () => {
    checkRateLimit("evict-me", 0);
    expect(_getTrackedClientCountForTests()).toBe(1);

    checkRateLimit("someone-else", RATE_LIMIT_WINDOW_MS + 1);

    expect(_getTrackedClientCountForTests()).toBe(1);
  });
});

describe("getClientKey", () => {
  function createReq(overrides: Partial<VercelRequest>): VercelRequest {
    return { headers: {}, ...overrides } as VercelRequest;
  }

  it("uses the first x-forwarded-for address", () => {
    const req = createReq({ headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" } });

    expect(getClientKey(req)).toBe("203.0.113.5");
  });

  it("falls back to the socket's remote address when there's no forwarded header", () => {
    const req = createReq({ headers: {}, socket: { remoteAddress: "198.51.100.9" } } as never);

    expect(getClientKey(req)).toBe("198.51.100.9");
  });

  it("falls back to a constant key when no address is available", () => {
    const req = createReq({ headers: {} });

    expect(getClientKey(req)).toBe("unknown");
  });
});
