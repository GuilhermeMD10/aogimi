// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // `.expo/` is generated on every `expo start` and git-ignored. Its
    // `types/router.d.ts` opens with a blanket `/* eslint-disable */` that this
    // config reports as unused — and since expo-router rewrites the file, the
    // only durable fix is to not lint it.
    ignores: ["dist/*", ".expo/*"],
  },
  {
    // Layer rule, mirroring `eslint.config.mjs` in the web app. Three layers,
    // one direction: lib/shared ← features ← app.
    //
    // Cross-feature imports are NOT restricted here — on the web that's
    // convention rather than enforcement, and the same applies. What this
    // catches is layering drift: a helper in lib/ quietly reaching up into
    // a feature.
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
              target: "./lib",
              from: "./app",
              message: "lib/ must not import from app/ — app composes, it is not composed from.",
            },
            {
              target: "./shared",
              from: "./app",
              message: "shared/ must not import from app/ — app composes, it is not composed from.",
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
]);
