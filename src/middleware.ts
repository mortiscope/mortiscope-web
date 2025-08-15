import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { hasValidAuthSession } from "@/lib/auth";
import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicApiRoutes,
  publicRoutes,
} from "@/routes";

// Get AUTH_SECRET directly from process.env to avoid importing heavy env validation
const AUTH_SECRET = process.env.AUTH_SECRET;

/**
 * The main middleware function, wrapped in the `auth` helper from NextAuth.js.
 * It intercepts requests to enforce authentication rules across the application.
 *
 * @param req The incoming Next.js request object.
 */
export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // Get JWT token with proper validation
  const token = await getToken({
    req,
    secret: AUTH_SECRET,
  });

  const isLoggedIn = !!token;

  // Categorize the current route to apply specific rules
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicApiRoute = publicApiRoutes.includes(nextUrl.pathname);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  // Allow all public API routes to pass through without checks
  if (isApiAuthRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // Handle authentication-related routes
  if (isAuthRoute) {
    // Special handling for 2FA routes - require valid auth session
    if (nextUrl.pathname === "/signin/two-factor" || nextUrl.pathname === "/signin/recovery") {
      const hasAuthSession = await hasValidAuthSession();
      if (!hasAuthSession) {
        return NextResponse.redirect(new URL("/signin?error=no-session", nextUrl));
      }
      // Allow access if there's a valid auth session
      return NextResponse.next();
    }

    // For other auth routes, redirect if already logged in
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    // If not logged in, allow them to access the auth page.
    return NextResponse.next();
  }

  // If a logged-in user tries to access a public route, redirect them to the dashboard
  if (isPublicRoute && isLoggedIn) {
    return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
  }

  // Protect all non-public routes
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/signin", nextUrl));
  }

  // If none of the above conditions are met, allow the request to proceed
  return NextResponse.next();
}

/**
 * Configures the middleware to run on specific paths
 */
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
