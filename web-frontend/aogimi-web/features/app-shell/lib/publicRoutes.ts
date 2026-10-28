/**
 * Routes anyone can open — signed out, and on a phone or tablet. Both gates
 * read this: `MobileGate` lets these through on any device, and `AppShell`
 * skips the sign-in redirect for them (and renders them bare when nobody is
 * signed in, since the nav is a signed-in surface).
 *
 * `/privacy` is here because the App Store and Play Store link to it, and a
 * reviewer opens that link on a phone without an account.
 */
const PUBLIC_ROUTES = ['/privacy'];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}
