import type { VercelRequest, VercelResponse } from "@vercel/node";

export const APP_HOST = "social-pulse-ruby.vercel.app";
export const APP_ORIGIN = `https://${APP_HOST}`;

export function createMockReq(overrides: Partial<VercelRequest>): VercelRequest {
  return {
    method: "POST",
    headers: { origin: APP_ORIGIN, host: APP_HOST },
    body: {},
    ...overrides,
  } as VercelRequest;
}

export function createMockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
      return res;
    },
  };
  return res as unknown as VercelResponse & { statusCode: number; body: unknown; headers: Record<string, string> };
}
