import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js Middleware — runs on every matched request BEFORE the page renders.
 *
 * Responsibilities:
 *  1. Refreshes the Supabase auth session (prevents premature logout)
 *  2. Redirects unauthenticated users from protected routes to /login
 *  3. Redirects authenticated users from auth pages to /dashboard
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Route matcher configuration.
 *
 * Matches all routes EXCEPT:
 *  - Next.js internals (_next/static, _next/image)
 *  - Static files (favicon, images, fonts, etc.)
 *  - API routes that don't need auth checking
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt, site.webmanifest
     * - Public assets: .png, .jpg, .svg, .ico, .webp, .woff2
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|site.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2|woff|ttf|otf)$).*)",
  ],
};
