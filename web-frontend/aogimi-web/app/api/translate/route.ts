import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Translation is disabled. This route was an unauthenticated, un-rate-limited
// proxy to DeepL using a server-side API key — anyone could POST to it and
// burn the paid quota. The DeepL feature is currently off behind a flag
// (lib/features/deepl.ts) and has no caller, so we hard-block the route here
// rather than leave an abusable proxy mounted. The backend translate route
// is blocked the same way.
//
// To re-enable: restore the proxy logic (see git history) AND add auth +
// per-IP/per-user rate limiting + a text-length cap before flipping this off.
export async function POST() {
  return NextResponse.json({ error: 'Translation is currently disabled.' }, { status: 403 });
}
