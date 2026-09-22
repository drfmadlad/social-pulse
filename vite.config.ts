/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Social Pulse",
        short_name: "Social Pulse",
        description: "Practice real-world conversations and get feedback on how you did.",
        start_url: "/",
        display: "standalone",
        background_color: "#F3F0E8",
        theme_color: "#F3F0E8",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Parallel agent worktrees live under .claude/worktrees, on disk inside this project
    // directory; each has its own node_modules, so scanning them alongside the real source
    // duplicates React and causes cross-worktree test failures that have nothing to do with
    // the code being tested here.
    exclude: ["**/node_modules/**", "**/.claude/worktrees/**"],
  },
});
