import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";


/**
 * Updates the Supabase session in middleware.
 *
 * IMPORTANT: This must be called in middleware.ts to keep the user session
 * fresh. Without this, the session cookie will expire and the user will be
 * logged out unexpectedly.
 *
 * @param request - The incoming Next.js request
 * @returns NextResponse with refreshed session cookies
 */
export async function updateSession(
  request: NextRequest
): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Supabase Middleware] Missing environment variables");
    return NextResponse.next({ request });
  }

  // Create an unmodified response to start
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        // Set cookies on the request (for use in Server Components)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        // Rebuild the response with the new cookies
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as any)
        );
      },
    },
  });

  // IMPORTANT: getUser() refreshes the session.
  // Do NOT remove this — it's what keeps tokens fresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route classification
  const { pathname } = request.nextUrl;

  const protectedPrefixes = [
    "/dashboard",
    "/upload",
    "/projects",
    "/analytics",
    "/billing",
    "/settings",
  ];

  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/signup/");

  // Unauthenticated user → protected route: redirect to /login with redirect param
  if (!user && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user → login/signup: redirect to /dashboard
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
