/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { linkedIconAssets, manifestIcons } from "./pwaIcons";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Not "autoUpdate": that reloads the page the moment a new worker activates, which would
      // discard a Practice Conversation held only in memory. Registration is our own
      // (src/useAppUpdate.ts) rather than the generated register script, whose prompt mode
      // reloads every open tab when any one of them takes an update.
      registerType: "prompt",
      injectRegister: false,
      includeAssets: linkedIconAssets,
      manifest: {
        name: "Social Pulse",
        short_name: "Social Pulse",
        description: "Practice real-world conversations and get feedback on how you did.",
        start_url: "/",
        display: "standalone",
        background_color: "#F3F0E8",
        theme_color: "#F3F0E8",
        icons: manifestIcons,
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
