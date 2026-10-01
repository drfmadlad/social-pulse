import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The light and dark palettes (DESIGN.md §3, Color). The dark palette follows the phone's setting
 * through `prefers-color-scheme`, so these guard what a screenshot in one mode can't: that every
 * token has a value in both, that no color escapes the tokens, and that the pairings text and
 * controls actually use meet WCAG AA in both.
 */

const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** The custom properties declared directly in one `:root { … }` block. */
function declarations(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(name, value.trim());
  }
  return tokens;
}

function blockAfter(source: string, selector: string): string {
  const start = source.indexOf(selector);
  if (start === -1) throw new Error(`No ${selector} block`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index++) {
    if (source[index] === "{") depth++;
    if (source[index] === "}" && --depth === 0) return source.slice(open + 1, index);
  }
  throw new Error("Unclosed block");
}

// Read from disk rather than imported: Vitest hands CSS imports to tests empty, even with `?raw`
// (src/test/nodeFs.d.ts types the one call).
const readRepoFile = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const indexCss = readRepoFile("./index.css");
const indexHtml = readRepoFile("../index.html");

const css = withoutComments(indexCss);
const lightRoot = blockAfter(css, ":root");
const darkRoot = blockAfter(blockAfter(css, "@media (prefers-color-scheme: dark)"), ":root");

const light = declarations(lightRoot);
const dark = declarations(darkRoot);
const colorTokens = [...light].filter(([, value]) => COLOR_LITERAL.test(value)).map(([name]) => name);

function tokenHex(palette: Map<string, string>, token: string): string {
  const value = palette.get(`--${token}`);
  if (!value || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`--${token} is not a six-digit hex color: ${value}`);
  return value;
}

function relativeLuminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((offset) => {
    const channel = parseInt(color.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Every foreground token on every ground it's actually set on (DESIGN.md §3, Contrast). Text is
 * 4.5:1 whatever its size; the non-text tier is WCAG's 3:1 for control edges and meaningful marks.
 */
const TEXT = 4.5;
const NON_TEXT = 3;
const PAIRINGS: [foreground: string, ground: string, minimum: number][] = [
  ["ink", "canvas", TEXT],
  ["ink", "surface", TEXT],
  ["ink", "primary-soft", TEXT],
  ["ink", "positive-soft", TEXT],
  ["ink", "growth-soft", TEXT],
  ["ink-muted", "canvas", TEXT],
  ["ink-muted", "surface", TEXT],
  ["ink-muted", "primary-soft", TEXT],
  ["ink-muted", "positive-soft", TEXT],
  ["ink-muted", "growth-soft", TEXT],
  ["primary", "canvas", TEXT],
  ["primary", "surface", TEXT],
  ["primary", "primary-soft", TEXT],
  ["on-primary", "primary", TEXT],
  // Input edges, the typing indicator, and receded options (inactive, so exempt, but kept legible).
  ["ink-faint", "canvas", NON_TEXT],
  ["ink-faint", "surface", NON_TEXT],
  ["ink-faint", "primary-soft", NON_TEXT],
  // The done check on a Lessons row, and the better option's edge on the "your move" ground.
  ["positive", "surface", NON_TEXT],
  ["positive", "primary-soft", NON_TEXT],
  // Not listed: a result block's --positive or --growth edge. Its verdict text carries the
  // meaning, so the edge is a boundary rather than a mark the user needs (WCAG 1.4.11).
];

describe("the color palette", () => {
  it("gives every light color token a dark value, and has no dark-only tokens", () => {
    expect(colorTokens.length).toBeGreaterThan(0);
    expect([...dark.keys()].sort()).toEqual([...colorTokens].sort());
  });

  describe.each([
    ["light", light],
    ["dark", dark],
  ] as const)("in %s mode", (_, palette) => {
    it.each(PAIRINGS)("--%s on --%s meets %s:1", (foreground, ground, minimum) => {
      expect(contrast(tokenHex(palette, foreground), tokenHex(palette, ground))).toBeGreaterThanOrEqual(minimum);
    });
  });

  it("colors the installed app's status bar with the canvas of each mode", () => {
    const themeColors = [...indexHtml.matchAll(/<meta\s+name="theme-color"([^>]*)>/g)].map(([, attributes]) => ({
      media: attributes.match(/media="([^"]*)"/)?.[1],
      content: attributes.match(/content="([^"]*)"/)?.[1]?.toUpperCase(),
    }));
    expect(themeColors).toEqual(
      expect.arrayContaining([
        { media: "(prefers-color-scheme: light)", content: tokenHex(light, "canvas").toUpperCase() },
        { media: "(prefers-color-scheme: dark)", content: tokenHex(dark, "canvas").toUpperCase() },
      ]),
    );
    expect(themeColors).toHaveLength(2);
  });
});

describe("colors outside the palette", () => {
  const scripts = import.meta.glob(["./**/*.{ts,tsx}", "!./**/*.test.{ts,tsx}", "!./test/**"], {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  const cssFiles = import.meta.glob("./**/*.css");
  // The two `:root` palettes are the one place a color literal belongs.
  const sources: Record<string, string> = {
    ...scripts,
    "./index.css": css.replace(lightRoot, "").replace(darkRoot, ""),
  };

  it("finds the source files to check, and index.css is the only stylesheet", () => {
    expect(Object.keys(cssFiles)).toEqual(["./index.css"]);
    // With their contents, not the empty strings CSS imports come back as.
    expect(scripts["./lessons/Confetti.tsx"]).toContain("--confetti-teal");
    expect(sources["./index.css"]).toContain(".lesson-flow--your-move");
  });

  it.each(Object.keys(sources))("%s uses only palette tokens", (path) => {
    const literals = withoutComments(sources[path])
      .split("\n")
      .filter((line) => COLOR_LITERAL.test(line));
    expect(literals).toEqual([]);
  });

  it("index.css names no colors outside the palette either", () => {
    const namedColors = sources["./index.css"]
      .split("\n")
      .filter((line) => /:[^;{]*\b(?:white|black|gr[ae]y|silver|red|green|blue|yellow|orange|purple|pink)\b/i.test(line));
    expect(namedColors).toEqual([]);
  });
});
