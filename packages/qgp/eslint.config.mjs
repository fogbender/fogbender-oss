import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

export default [
  {
    ignores: ["**/dist", "**/node_modules"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },

      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "commonjs",

      parserOptions: {
        ecmaFeatures: {
          legacyDecorators: true,
          jsx: true,
        },
      },
    },

    files: ["**/*{ts,js,mjs,cjs}"],

    rules: {
      ...js.configs.recommended.rules,
      "import/no-named-as-default": "off",
      "require-resolve-not-external": "off",
    },
}];
