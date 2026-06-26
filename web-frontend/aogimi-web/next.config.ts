import type { NextConfig } from "next";
import path from "path";

// Backend origin the client talks to (apiUrl in lib/api.ts). CSP connect-src
// must allow it or every API call is blocked. Defaults to the dev backend.
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").origin;
  } catch {
    return "http://localhost:3000";
  }
})();

// Content-Security-Policy. Applied in production only — dev (Turbopack HMR)
// needs 'unsafe-eval' and websocket connect-src, and relaxing those in dev
// keeps the policy honest about what production actually ships.
//
// Notes on the allowances (don't tighten without testing the reader):
//   - script-src keeps 'unsafe-inline' because Next injects inline bootstrap
//     scripts and app/layout.tsx ships a tiny inline theme-init script.
//     Locking this to nonces needs request-time middleware (deferred); the
//     principal XSS vector — untrusted EPUB content — is already contained
//     at the iframe-sandbox level (foliate-js no longer gets allow-scripts),
//     and auth tokens are no longer in localStorage.
//   - img-src/font-src allow data: + blob: — EPUB cover images are data:
//     URLs and foliate renders embedded resources from blob:.
//   - frame-src/worker-src allow blob: — foliate loads book sections into
//     blob: iframes and pdf.js spins up a blob: worker.
//   - connect-src is 'self' + the backend origin.
const PROD_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  `connect-src 'self' ${API_ORIGIN}`,
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Content-Security-Policy", value: PROD_CSP }]
    : []),
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        // Apply to every route. Static assets inherit these too, which is fine.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
