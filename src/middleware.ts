import { NextRequest, NextResponse } from "next/server";

import { updateSessionActivity } from "@/features/account/actions/update-session-activity";
import { hasValidAuthSession } from "@/lib/auth";
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

  // Check for JWT token using NextAuth's getToken function
  let isLoggedIn = false;

  try {
    // Import getToken function for JWT sessions
    const { getToken } = await import("next-auth/jwt");
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });

    if (token) {
      // For JWT sessions, check if the session still exists in database
      const sessionToken = token.sessionId as string;

      if (sessionToken) {
        const { db } = await import("@/db");
        const { sessions } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");

        try {
          const sessionExists = await db
            .select()
            .from(sessions)
            .where(eq(sessions.sessionToken, sessionToken))
            .limit(1);

          isLoggedIn = sessionExists.length > 0;

          if (!isLoggedIn) {
          }
        } catch {
          // If database check fails, fall back to basic JWT validation
          isLoggedIn = !!token;
        }
      } else {
        // No session token in JWT, use basic validation

        isLoggedIn = !!token;
      }
    } else {
      isLoggedIn = false;
    }
  } catch {
    // Fallback to cookie check if token function fails
    const sessionCookie =
      req.cookies.get("authjs.session-token") || req.cookies.get("__Secure-authjs.session-token");
    isLoggedIn = !!sessionCookie;
  }

  // Categorize the current route to apply specific rules
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicApiRoute = publicApiRoutes.includes(nextUrl.pathname);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  // Handle NextAuth error redirects for OAuth 2FA
  if (
    nextUrl.pathname === "/api/auth/error" &&
    nextUrl.searchParams.get("error") === "AccessDenied"
  ) {
    try {
      const hasAuthSession = await hasValidAuthSession();
      if (hasAuthSession) {
        // Redirect to 2FA page if there's a valid auth session
        return NextResponse.redirect(new URL("/signin/two-factor", nextUrl));
      }
    } catch {
      // Failed to check auth session, continue with normal error flow
    }
  }

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

  // Update session activity for authenticated users
  if (isLoggedIn) {
    try {
      // Get session cookie for activity update
      const sessionCookie =
        req.cookies.get("authjs.session-token") || req.cookies.get("__Secure-authjs.session-token");

      if (sessionCookie?.value) {
        // Update session activity in background
        updateSessionActivity(sessionCookie.value).catch(() => {
          // Session activity update failed, but don't block the request
        });
      }
    } catch {
      // Session activity update failed, but don't block the request
    }
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
