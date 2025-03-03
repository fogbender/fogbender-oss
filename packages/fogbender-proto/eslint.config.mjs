import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";

import prettier from "eslint-plugin-prettier";
import react from "eslint-plugin-react";
import eslintPluginStandard from "eslint-plugin-standard";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";
import jestPlugin from "eslint-plugin-jest";

export default [
  {
    ignores: ["**/build/", "**/dist/", "**/node_modules/", "**/.snapshots/", "**/*.min.js"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...jestPlugin.environments.globals.globals,
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

    files: ["**/*.{ts,tsx,js}"],

    plugins: {
      eslintPluginStandard,
      tsEslintPlugin,
      react,
      prettier,
      jest: jestPlugin,
    },

    settings: {
      react: {
        version: "17",
      },
    },

    rules: {
      ...js.configs.recommended.rules,
      "space-before-function-paren": 0,
      "react/prop-types": 0,
      "react/jsx-handler-names": 0,
      "react/jsx-fragments": 0,
      "react/no-unused-prop-types": 0,
      "import/export": 0,
      "no-unused-vars": 0,
      "tsEslintPlugin/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_",
        },
      ],
      "no-redeclare": 0,
    },
  },
  {
    files: ["**/*.d.ts"],
    languageOptions: {
      globals: {
        React: "readonly",
      },
    },
  },
];
