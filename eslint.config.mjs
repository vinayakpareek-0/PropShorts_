import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const nextConfigs = compat.extends("next/core-web-vitals", "next/typescript").map((config) => ({
  ...config,
  settings: {
    ...config.settings,
    next: {
      ...config.settings?.next,
      rootDir: __dirname,
    },
  },
}));

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".netlify/**",
      "out/**",
      "node_modules/**",
      "coverage/**",
      "build/**",
      "public/**",
      "design-inputs/**",
      "supabase/.temp/**",
      "next-env.d.ts",
      "*.config.js",
      "*.config.mjs",
    ],
  },
  ...nextConfigs,
];

export default eslintConfig;
