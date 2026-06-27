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
// The reader is the dominant constraint here: foliate renders each EPUB
// section into a `blob:` iframe that INHERITS this CSP, and pdf.js loads its
// document + worker from `blob:` URLs. So the reader-facing fetch/style/font/
// script/img/frame/worker directives must all permit `blob:` (and `data:`),
// or book content silently fails to load. Don't strip `blob:`/`data:` from
// these without re-testing both readers in a production build.
//
// What still holds after those allowances: default-src 'self', object-src
// 'none', base-uri 'self', form-action 'self', frame-ancestors 'none', and a
// connect-src limited to self + the API + blob: — so even a script running in
// an EPUB iframe can't exfiltrate to an arbitrary remote origin via fetch.
// (The token-theft vector is closed separately: no tokens live in JS.)
//
// script-src keeps 'unsafe-inline' for Next's inline bootstrap + the inline
// theme-init script in app/layout.tsx; tightening to nonces needs request-time
// middleware (deferred).
const PROD_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' blob:",
  "style-src 'self' 'unsafe-inline' blob:",
  "img-src 'self' data: blob:",
  "font-src 'self' data: blob:",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  `connect-src 'self' blob: ${API_ORIGIN}`,
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
