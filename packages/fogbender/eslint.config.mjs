import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: [
        "eslint.config.mjs",
        "**/build/",
        "**/dist/",
        "**/node_modules/",
        "**/.snapshots/",
        "**/*.min.js",
    ],
}, ...compat.extends(
    // "standard",
    // "standard-react",
    "plugin:prettier/recommended",
    "prettier/standard",
    "prettier/react",
    "plugin:@typescript-eslint/eslint-recommended"
), {
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
}];
