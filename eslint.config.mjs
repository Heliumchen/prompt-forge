import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Add your own custom configuration to override or extend rules
  {
    // You can specify which files you want to apply these rules to (e.g., only ts/tsx):
    // files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          // Ignore variables that start with `_`
          varsIgnorePattern: "^_",
          // Ignore parameters that start with `_`
          argsIgnorePattern: "^_",
          // Allow unused siblings when using rest destructuring
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];

export default eslintConfig;
