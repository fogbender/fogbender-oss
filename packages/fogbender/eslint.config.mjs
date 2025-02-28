import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";

import prettier from "eslint-plugin-prettier";
import react from "eslint-plugin-react";
import eslintPluginStandard from "eslint-plugin-standard";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: [
      "eslint.config.mjs",
      "**/build/",
      "**/dist/",
      "**/node_modules/",
      "**/.snapshots/",
      "**/*.min.js",
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
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

    files: ["**/*.{ts,tsx}"],

    plugins: {
      eslintPluginStandard,
      tsEslintPlugin,
      react,
      prettier,
    },

    settings: {
      react: {
        version: "17",
      },
    },

    rules: {
      "no-useless-return": 0,
      "react/no-unknown-property": 0,
      "space-before-function-paren": 0,
      "react/prop-types": 0,
      "react/jsx-handler-names": 0,
      "react/jsx-fragments": 0,
      "react/no-unused-prop-types": 0,
      "no-unused-vars": 0,
      "react/react-in-jsx-scope": 0,
      "import/export": 0,
    },
  },
];
