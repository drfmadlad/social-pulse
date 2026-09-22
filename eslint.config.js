import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "coverage"] },
  {
    files: ["**/*.{ts,tsx,mjs}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    // The browser app. `react-hooks` is the rule set the repo already writes disable comments
    // against, so it's the reason this config exists at all.
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    // Everything outside the browser bundle: the serverless function, the icon script, and the
    // Vite and ESLint configs themselves.
    files: ["api/**/*.ts", "scripts/**/*.mjs", "*.config.{ts,js}"],
    languageOptions: { globals: globals.node },
  },
);
