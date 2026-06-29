import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Feature-oriented architecture boundaries. The dependency direction is
  // one-way:  lib / shared  ←  features  ←  app.
  //   - lib/ and shared/ are the bottom layer and must never import a feature.
  //   - features/ may import lib, shared, and other features (via their barrel),
  //     but never app/ (app composes features, not the reverse).
  // Cross-feature "import only via the feature's index barrel" is a convention
  // (see CLAUDE.md); enforce with eslint-plugin-boundaries later if desired.
  {
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./lib",
              from: "./features",
              message: "lib/ is the shared bottom layer — it must not import from features/.",
            },
            {
              target: "./shared",
              from: "./features",
              message: "shared/ is the shared bottom layer — it must not import from features/.",
            },
            {
              target: "./features",
              from: "./app",
              message: "features/ must not import from app/ — app composes features, not the reverse.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored third-party ES modules (foliate-js) served from /public.
    "public/foliate-js/**",
  ]),
]);

export default eslintConfig;
