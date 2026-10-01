// The app's icons as the PWA manifest and precache see them. Kept out of vite.config.ts so
// pwaIcons.test.ts can check each one against the file in public/. The rasters are generated
// from public/icons/icon.svg by `npm run gen-icons`.

export const manifestIcons = [
  { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
  { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

// Icons index.html links to that aren't in the manifest. The plugin precaches manifest icons on
// its own, so these are the ones includeAssets has to name for them to work offline.
export const linkedIconAssets = ["favicon.ico", "icons/icon.svg", "icons/apple-touch-icon.png"];
