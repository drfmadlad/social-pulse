import type { VercelRequest } from "./vercelTypes.js";
import { afterEach, describe, expect, it } from "vitest";
import { isAllowedOrigin } from "./originCheck.js";

const originalVercelEnv = process.env.VERCEL_ENV;

afterEach(() => {
  if (originalVercelEnv === undefined) {
    delete process.env.VERCEL_ENV;
  } else {
    process.env.VERCEL_ENV = originalVercelEnv;
  }
});

function createReq(headers: Record<string, string | string[] | undefined>): VercelRequest {
  return { headers } as VercelRequest;
}

describe("isAllowedOrigin", () => {
  it("allows an Origin that matches the request's own host", () => {
    const req = createReq({ origin: "https://social-pulse-ruby.vercel.app", host: "social-pulse-ruby.vercel.app" });

    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("rejects an Origin from a different site", () => {
    const req = createReq({ origin: "https://evil.example.com", host: "social-pulse-ruby.vercel.app" });

    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("falls back to Referer when there's no Origin header", () => {
    const req = createReq({
      referer: "https://social-pulse-ruby.vercel.app/practice",
      host: "social-pulse-ruby.vercel.app",
    });

    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("rejects a Referer from a different site", () => {
    const req = createReq({ referer: "https://evil.example.com/attack", host: "social-pulse-ruby.vercel.app" });

    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("rejects when neither Origin nor Referer is present", () => {
    const req = createReq({ host: "social-pulse-ruby.vercel.app" });

    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("rejects an unparseable Origin value", () => {
    const req = createReq({ origin: "not-a-url", host: "social-pulse-ruby.vercel.app" });

    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("allows a localhost Origin regardless of the request host, for local dev", () => {
    const req = createReq({ origin: "http://localhost:5173", host: "localhost:3000" });

    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("allows a 127.0.0.1 Origin for local dev", () => {
    const req = createReq({ origin: "http://127.0.0.1:5173", host: "localhost:3000" });

    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("rejects a localhost Origin against a real production deployment", () => {
    process.env.VERCEL_ENV = "production";
    const req = createReq({ origin: "http://localhost:5173", host: "social-pulse-ruby.vercel.app" });

    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("rejects a localhost Origin against a preview deployment", () => {
    process.env.VERCEL_ENV = "preview";
    const req = createReq({ origin: "http://localhost:5173", host: "social-pulse-git-feature.vercel.app" });

    expect(isAllowedOrigin(req)).toBe(false);
  });

  it("allows a localhost Origin when VERCEL_ENV is development (vercel dev)", () => {
    process.env.VERCEL_ENV = "development";
    const req = createReq({ origin: "http://localhost:5173", host: "localhost:3000" });

    expect(isAllowedOrigin(req)).toBe(true);
  });

  it("matches host case-insensitively via URL normalization", () => {
    const req = createReq({ origin: "https://Social-Pulse-Ruby.vercel.app", host: "social-pulse-ruby.vercel.app" });

    expect(isAllowedOrigin(req)).toBe(true);
  });
});
