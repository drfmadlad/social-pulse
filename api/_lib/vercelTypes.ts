// Local copy of the two handler types api/ needs from `@vercel/node`.
//
// `@vercel/node` was only ever imported for these types, but installing it pulled in an
// unfixable vulnerable dependency tree (undici, path-to-regexp, ajv, an older esbuild) that it
// pins exactly. Vercel's builder brings its own copy at deploy time, so nothing in api/ needs the
// package installed. These mirror its `VercelRequest` / `VercelResponse` definitions.
import type { IncomingMessage, ServerResponse } from "node:http";

export type VercelRequest = IncomingMessage & {
  query: { [key: string]: string | string[] };
  cookies: { [key: string]: string };
  // Parsed by Vercel from the request body; shape is validated by each handler.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
};

export type VercelResponse = ServerResponse & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send: (body: any) => VercelResponse;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
  redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
};
