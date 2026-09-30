// The one Node API a test here needs: src/palette.test.ts reads index.css from disk, because
// Vitest hands CSS imports to tests as empty strings, even with `?raw`. Declared narrowly rather
// than pulling in @types/node, which would give the whole app's typecheck Node's globals.
declare module "node:fs" {
  export function readFileSync(path: URL, encoding: "utf8"): string;
}
