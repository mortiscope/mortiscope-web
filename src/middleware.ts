import { NextRequest, NextResponse } from "next/server";

import {
  apiAuthPrefix,
  authRoutes,
  DEFAULT_LOGIN_REDIRECT,
  publicApiRoutes,
  publicRoutes,
} from "@/routes";

/**
 * Helper function to validate session by calling the validation API
 */
async function validateSession(req: NextRequest): Promise<boolean> {
  try {
    const response = await fetch(new URL("/api/validate", req.url), {
      method: "POST",
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.isValid === true;
  } catch {
    // Fallback to cookie check if API call fails
    const sessionCookie =
      req.cookies.get("authjs.session-token") || req.cookies.get("__Secure-authjs.session-token");
    return !!sessionCookie;
  }
}

/**
 * Helper function to validate auth session
 */
async function validateAuthSession(req: NextRequest): Promise<boolean> {
  try {
    const response = await fetch(new URL("/api/auth/check", req.url), {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.isValid === true;
  } catch {
    return false;
  }
}

/**
 * The main middleware function that enforces authentication rules across the application.
 * @param req The incoming Next.js request object.
 */
export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  // Categorize the current route to apply specific rules
  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicApiRoute = publicApiRoutes.includes(nextUrl.pathname);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  // Allow all public API routes to pass through without checks
  if (isApiAuthRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // Validate session once for all protected routes
  const isLoggedIn = await validateSession(req);

  // Handle NextAuth error redirects for OAuth 2FA
  if (
    nextUrl.pathname === "/api/auth/error" &&
    nextUrl.searchParams.get("error") === "AccessDenied"
  ) {
    const hasAuthSession = await validateAuthSession(req);
    if (hasAuthSession) {
      return NextResponse.redirect(new URL("/signin/two-factor", nextUrl));
    }
  }

  // Handle authentication-related routes
  if (isAuthRoute) {
    // Special handling for 2FA routes - require valid auth session
    if (nextUrl.pathname === "/signin/two-factor" || nextUrl.pathname === "/signin/recovery") {
      const hasAuthSession = await validateAuthSession(req);
      if (!hasAuthSession) {
        return NextResponse.redirect(new URL("/signin?error=no-session", nextUrl));
      }
      return NextResponse.next();
    }

    // For other auth routes, redirect if already logged in
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
    }
    return NextResponse.next();
  }

  // If a logged-in user tries to access a public route, redirect them to the dashboard
  if (isPublicRoute && isLoggedIn) {
    return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl));
  }

  // Protect all non-public routes
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // Update session activity for authenticated users on protected routes
  if (isLoggedIn && !isPublicRoute && !isApiAuthRoute && !isPublicApiRoute) {
    // Fire and forget. This doesn't await to avoid blocking the request
    fetch(new URL("/api/session", req.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({}),
    }).catch(() => {
      // Session activity update failed, but don't block the request
    });
  }

  return NextResponse.next();
}

/**
 * Configures the middleware to run on specific paths
 */
export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
