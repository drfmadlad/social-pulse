// @vitest-environment node
// Checks the icon files in public/ against what the manifest and index.html say about them. The
// maskable safe zone is checked by the generator itself (scripts/generate-icons.mjs), which
// refuses to write a maskable icon whose mark reaches outside it.
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { linkedIconAssets, manifestIcons } from "./pwaIcons";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const RGB_NO_ALPHA = 2;

const publicFile = (path: string) => new URL(`./public/${path.replace(/^\//, "")}`, import.meta.url);

function readPng(path: string) {
  const bytes = readFileSync(publicFile(path));
  expect(bytes.subarray(0, 8), `${path} is not a PNG`).toEqual(PNG_SIGNATURE);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colourType: bytes[25],
    hasTransparencyChunk: bytes.includes("tRNS"),
  };
}

function expectOpaque(path: string) {
  const png = readPng(path);
  expect(png.colourType, `${path} has an alpha channel`).toBe(RGB_NO_ALPHA);
  expect(png.hasTransparencyChunk, `${path} has a tRNS chunk`).toBe(false);
  return png;
}

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const iconLinks = [...html.matchAll(/<link\b[^>]*>/g)]
  .map(([tag]) => ({
    rel: tag.match(/\brel="([^"]+)"/)?.[1],
    href: tag.match(/\bhref="([^"]+)"/)?.[1] ?? "",
  }))
  .filter(({ rel }) => rel === "icon" || rel === "apple-touch-icon");

describe("app icons", () => {
  it.each(manifestIcons)("manifest icon $src is a PNG at the size it declares", (icon) => {
    const { width, height } = readPng(icon.src);
    expect(`${width}x${height}`).toBe(icon.sizes);
  });

  it("has a maskable icon, and it's opaque so its ground fills the platform's mask", () => {
    const maskable = manifestIcons.filter((icon) => icon.purpose === "maskable");
    expect(maskable).toHaveLength(1);
    expectOpaque(maskable[0].src);
  });

  it("links an opaque 180×180 Apple touch icon, since iOS turns transparency black", () => {
    const apple = iconLinks.filter(({ rel }) => rel === "apple-touch-icon");
    expect(apple).toHaveLength(1);
    const { width, height } = expectOpaque(apple[0].href);
    expect([width, height]).toEqual([180, 180]);
  });

  it("links a favicon", () => {
    expect(iconLinks.filter(({ rel }) => rel === "icon")).not.toHaveLength(0);
  });

  it.each(iconLinks)("precaches $href, which index.html links as $rel", ({ href }) => {
    expect(existsSync(publicFile(href)), `${href} is missing from public/`).toBe(true);
    const precached = [...linkedIconAssets, ...manifestIcons.map((icon) => icon.src)];
    expect(precached).toContain(href.replace(/^\//, ""));
  });

  it.each(linkedIconAssets)("includeAssets entry %s exists in public/", (path) => {
    expect(existsSync(publicFile(path))).toBe(true);
  });
});
