import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The browser app must never import from `api/`. `vercel dev` routes every `/api/*` URL to the
// serverless functions, so Vite's dev server can't serve an `api/` module to the browser: the
// import 404s and the whole app renders blank, locally only (a production build inlines it, so
// nothing warns you). Values both sides need are kept as two copies with a test that they agree,
// e.g. the request limits in `src/requestLimits.ts` and `api/_lib/requestLimits.ts`.

// Vitest runs from the repo root (the jsdom environment gives `import.meta.url` no file scheme).
const repoRoot = process.cwd();
const srcDir = join(repoRoot, "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const importFromApi = /(?:from\s+|import\s*\()\s*["'](?:\.\.\/)+api\//;

describe("the browser app's import boundary", () => {
  it("finds app source to check", () => {
    expect(sourceFiles(srcDir).length).toBeGreaterThan(20);
  });

  it("has no app module that imports from api/", () => {
    const offenders = sourceFiles(srcDir)
      .filter((file) => importFromApi.test(readFileSync(file, "utf8")))
      .map((file) => relative(repoRoot, file).replaceAll("\\", "/"));
    expect(offenders).toEqual([]);
  });
});
