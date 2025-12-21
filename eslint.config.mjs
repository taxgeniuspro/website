import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "next-env.d.ts",
      "public/sw.js",
      "public/workbox-*.js",
      "*.spec.js",
      "debug-responsive.spec.js",
      "playwright.config.js",
      ".cache/**",
      "coverage/**",
      "**/*.config.{js,mjs,ts}",
      "__tests__/**",
      "e2e/**",
      "**/*.test.{js,ts,tsx}",
      "**/*.spec.{js,ts,tsx}",
      "scripts/**",
      "prisma/**",
      "Ira folder/**", // Third-party plugins
      "AAA Folder/**", // Reference/third-party files
      "vendor/**", // Third-party vendor code
      "*.mjs", // Root utility scripts
      "check-*.mjs",
      "regenerate_*.mjs",
      "uploads/**", // Uploaded test files
      "Ira Folder/**", // Additional third-party reference files
      ".archive/**", // Archived legacy scripts
      "check-user-role.js", // Root legacy script
      "test-login.js", // Root legacy test script
      "test-nav-links.js", // Root legacy test script
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // React specific rules
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
      "react/prop-types": "off", // Using TypeScript

      // General best practices
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",

      // Next.js specific
      "no-undef": "off", // TypeScript handles this
    },
  },
];
