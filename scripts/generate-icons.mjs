// Regenerates every app icon raster from the one SVG source, public/icons/icon.svg:
//
//   npm run gen-icons
//
// Edit the SVG, run this, and commit the SVG and the PNG/ICO files together. The outputs are
// checked in, so a build never needs this script or its renderer (@resvg/resvg-js, a
// devDependency). pwaIcons.test.ts checks the results against the manifest and index.html.
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const SOURCE = "public/icons/icon.svg";
const VIEWBOX = 512;

// A maskable icon's platform mask may crop anything outside a centred circle of 40% of the
// icon's size (the W3C manifest spec's safe zone). The mark's farthest point, the bubble's tail
// tip, sits about 198 units from the centre at full size, so 0.88 brings it to about 174,
// inside the 204.8 limit with some air to spare.
const MASKABLE_SCALE = 0.88;
const SAFE_ZONE_RADIUS = 0.4;

const source = readFileSync(SOURCE, "utf8");
const ground = source.match(/<rect id="ground"[^>]*\bfill="(#[0-9A-Fa-f]{6})"/)?.[1];
const mark = source.match(/<g id="mark">[\s\S]*?<\/g>/)?.[0];
if (!ground || !mark) {
  throw new Error(`${SOURCE} needs a <rect id="ground" fill="#RRGGBB"> and a <g id="mark">.`);
}

// The mark on a ground that runs to every edge, for icons a platform masks itself (maskable,
// Apple touch). Scaled about the centre.
function fullBleed(scale) {
  const c = VIEWBOX / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}">` +
    `<rect width="${VIEWBOX}" height="${VIEWBOX}" fill="${ground}"/>` +
    `<g transform="translate(${c} ${c}) scale(${scale}) translate(${-c} ${-c})">${mark}</g>` +
    `</svg>`
  );
}

function render(svg, size) {
  return new Resvg(svg, { fitTo: { mode: "width", value: size } }).render();
}

// --- Opaque PNG encoding ------------------------------------------------------------------
// resvg always writes RGBA. iOS fills any transparency in an Apple touch icon with black, and a
// maskable icon must be opaque too, so those two are re-encoded as RGB with no alpha channel at
// all, after checking that nothing in them was transparent to begin with.

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function opaquePng(image, name) {
  const { width, height, pixels } = image;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let out = 0;
  for (let y = 0; y < height; y++) {
    raw[out++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 3] !== 255) throw new Error(`${name} has a transparent pixel at ${x},${y}.`);
      raw[out++] = pixels[i];
      raw[out++] = pixels[i + 1];
      raw[out++] = pixels[i + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB, no alpha
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Every pixel outside the safe zone must be plain ground, or the mark risks being cropped.
function assertInsideSafeZone(image, name) {
  const { width, height, pixels } = image;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(ground.slice(i, i + 2), 16));
  const limit = SAFE_ZONE_RADIUS * width;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2) <= limit) continue;
      const i = (y * width + x) * 4;
      if (pixels[i] !== r || pixels[i + 1] !== g || pixels[i + 2] !== b) {
        throw new Error(`${name}: the mark reaches outside the maskable safe zone at ${x},${y}.`);
      }
    }
  }
}

// An .ico holding PNG images, which every browser that still asks for /favicon.ico accepts.
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length + 16 * pngs.length;
  const entries = pngs.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size; // width
    entry[1] = size; // height
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs.map(({ png }) => png)]);
}

// --- Outputs ------------------------------------------------------------------------------

function write(path, data) {
  writeFileSync(path, data);
  console.log(`wrote ${path} (${data.length} bytes)`);
}

// Manifest "any" icons: the SVG as drawn, rounded corners and all.
for (const size of [192, 512]) {
  write(`public/icons/icon-${size}.png`, render(source, size).asPng());
}

const maskable = render(fullBleed(MASKABLE_SCALE), 512);
assertInsideSafeZone(maskable, "icon-maskable-512.png");
write("public/icons/icon-maskable-512.png", opaquePng(maskable, "icon-maskable-512.png"));

// iOS rounds the corners itself, to about the SVG's own radius, so the mark keeps its size.
write(
  "public/icons/apple-touch-icon.png",
  opaquePng(render(fullBleed(1), 180), "apple-touch-icon.png"),
);

write(
  "public/favicon.ico",
  ico([16, 32].map((size) => ({ size, png: render(source, size).asPng() }))),
);
