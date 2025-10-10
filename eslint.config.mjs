import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignore build artifacts and non-app folders
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "public/**",
      "next-env.d.ts",
      // Project scripts/configs that may use CommonJS
      "check-env.js",
      "**/*.config.js",
      "public/icons/generate-icons.js",
      "prisma/seed.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
