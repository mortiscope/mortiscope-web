/**
 * The prefix for all API routes used by Auth.js for authentication
 * @type {string}
 */
export const apiAuthPrefix: string = "/api/auth";

/**
 * An array of routes used for authentication purposes
 * @type {string[]}
 */
export const authRoutes: string[] = ["/signin", "/signup", "/forgot-password", "/reset-password"];

/**
 * The default URL to redirect users to after a successful sign-in
 * @type {string}
 */
export const DEFAULT_LOGIN_REDIRECT: string = "/dashboard";

/**
 * An array of routes that are accessible to the public, regardless of authentication status
 * @type {string[]}
 */
export const publicRoutes: string[] = ["/", "/verification"];
