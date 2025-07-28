import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicApiRoutes,
  publicRoutes,
} from "@/routes";

/**
 * The main middleware function, wrapped in the `auth` helper from NextAuth.js.
 * It intercepts requests to enforce authentication rules across the application.
 * 
 * @param req The incoming Next.js request object.
 */
export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // Get JWT token directly
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
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
