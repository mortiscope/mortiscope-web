import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getUserByEmail, getUserById } from "@/data/user";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { trackSession } from "@/features/account/actions/track-session";
import { SignInSchema } from "@/features/auth/schemas/auth";
import { config } from "@/lib/config";
import { sendEmailChangeNotification } from "@/lib/mail";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Specifies the Drizzle ORM adapter, linking NextAuth to the application's database schema
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  // Use JWT sessions for credentials and database for OAuth
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  // Events are asynchronous functions that do not return a response, used for side effects.
  events: {
    async linkAccount({ user }) {
      // Guard clause to ensure the user object and its ID exist.
      if (!user?.id) return;

      await db
        .update(schema.users)
        .set({ emailVerified: new Date() })
        .where(eq(schema.users.id, user.id));
    },
    async signIn({ user }) {
      if (!user?.id) {
        return;
      }
    },
  },
  providers: [
    ...config.auth.config.providers,
    Credentials({
      /**
       * The core logic for the credentials provider.
       * @param credentials The email and password from the sign-in form.
       * @returns A promise resolving to the user object on success, or null on failure.
       */
      async authorize(credentials) {
        const validatedFields = SignInSchema.safeParse(credentials);

        if (validatedFields.success) {
          const { email, password } = validatedFields.data;
          const user = await getUserByEmail(email);

          // Return null if the user is not found or has no password (e.g., OAuth user).
          if (!user || !user.password) {
            return null;
          }

          // Special case: 2FA-verified signin
          if (password === "2fa-verified") {
            // Verify that there's a valid verified auth session for this user
            const { getAuthSession } = await import("@/lib/auth");
            const authSession = await getAuthSession();

            if (
              authSession?.verified &&
              authSession.email === email &&
              authSession.userId === user.id
            ) {
              // Mark this user as 2FA verified for the signIn callback
              (user as typeof user & { _2faVerified: boolean })._2faVerified = true;
              return user;
            }
            return null;
          }

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) {
            return user;
          }
        }
        return null;
      },
    }),
  ],
  callbacks: {
    // Override the session callback to add session tracking
    async session({ session, token }) {
      // JWT session - token object is available
      if (token && session.user) {
        session.user.id = token.sub!;

        // Get fresh user data from database
        try {
          const dbUser = await getUserById(token.sub!);
          if (dbUser) {
            session.user.name = dbUser.name;
            session.user.email = dbUser.email;
            session.user.image = dbUser.image;
          }
        } catch {
          // Failed to fetch fresh user data, continue with existing data
        }

        // Add session tracking for JWT sessions
        try {
          // Get request info for session tracking
          const headersList = await headers();
          const userAgent = headersList.get("user-agent") || "Unknown";
          const forwardedFor = headersList.get("x-forwarded-for");
          const realIp = headersList.get("x-real-ip");
          const cfConnectingIp = headersList.get("cf-connecting-ip");

          let ipAddress = "127.0.0.1";
          if (forwardedFor) {
            ipAddress = forwardedFor.split(",")[0]?.trim() || "127.0.0.1";
          } else if (realIp) {
            ipAddress = realIp;
          } else if (cfConnectingIp) {
            ipAddress = cfConnectingIp;
          }

          // For JWT sessions, create a stable session token.
          const sessionToken = (token.sessionId as string) || crypto.randomUUID();

          // Track session in background
          trackSession({
            userId: token.sub!,
            sessionToken,
            userAgent,
            ipAddress,
          }).catch(() => {
            // Session tracking failed, but don't block the request.
          });

          // Add session token to session for client use
          (session as { sessionToken?: string }).sessionToken = sessionToken;
        } catch {
          // JWT session tracking failed, continue without tracking
        }
      }

      return session;
    },

    async jwt({ token, user, profile }) {
      // Check if JWT token's session is blacklisted (revoked)
      if (token.sessionId) {
        try {
          const isBlacklisted = await db.query.revokedJwtTokens.findFirst({
            where: eq(schema.revokedJwtTokens.sessionToken, token.sessionId as string),
          });

          if (isBlacklisted) {
            return null;
          }
        } catch {
          // Failed to check session blacklist, allow token
        }
      }

      // JWT is used for session management
      if (user) {
        token.sub = user.id;
        token.jti = token.jti || crypto.randomUUID();

        // Create a stable session ID that persists across JWT renewals
        if (!token.sessionId) {
          token.sessionId = crypto.randomUUID();
        }
      }

      // Store profile image in token for OAuth providers
      if (profile?.picture) {
        token.picture = profile.picture;
      }

      return token;
    },
    /**
     * Handles redirects after sign-in attempts
     */
    async redirect({ url, baseUrl }) {
      // Get the request to preserve the original host
      const headersList = await headers();
      const host = headersList.get("host");
      const protocol =
        headersList.get("x-forwarded-proto") ||
        (headersList.get("x-forwarded-ssl") === "on" ? "https" : "http");

      // Use the actual request host if available
      const actualBaseUrl = host ? `${protocol}://${host}` : baseUrl;

      // Handle relative URLs
      if (url.startsWith("/")) {
        return `${actualBaseUrl}${url}`;
      }

      // Handle absolute URLs
      try {
        const urlObj = new URL(url);
        const actualBaseObj = new URL(actualBaseUrl);
        const originalBaseObj = new URL(baseUrl);

        // Allow if same as actual host or original base URL
        if (urlObj.origin === actualBaseObj.origin || urlObj.origin === originalBaseObj.origin) {
          return url;
        }
      } catch {
        // Invalid URL, fallback to actual base URL
      }

      return actualBaseUrl;
    },
    /**
     * Acts as a gatekeeper for sign-in attempts
     */
    async signIn({ user, account, profile }) {
      if (!user.id) {
        return false;
      }

      // Allow OAuth providers to sign in without email verification check
      if (account?.provider !== "credentials") {
        const providerEmail = profile?.email;
        if (providerEmail && user.email !== providerEmail) {
          await db
            .update(schema.users)
            .set({
              email: providerEmail,
              emailVerified: new Date(),
            })
            .where(eq(schema.users.id, user.id));

          // Send a notification about the automatic email update.
          try {
            await sendEmailChangeNotification(providerEmail, "new");
          } catch {
            // Failed to send notification, continue
          }
        }

        // Check if user has 2FA enabled for OAuth sign-ins
        const twoFactorData = await db.query.userTwoFactor.findFirst({
          where: eq(schema.userTwoFactor.userId, user.id),
        });

        if (twoFactorData?.enabled) {
          // Create a temporary auth session for OAuth 2FA
          const { createAuthSession } = await import("@/lib/auth");
          await createAuthSession(
            user.id,
            user.email || providerEmail || "",
            account?.provider || "oauth"
          );
          // Block sign-in to force 2FA verification
          return false;
        }

        return true;
      }

      // For credential-based sign-in, block the user if their email is not verified
      const existingUser = await getUserById(user.id);

      if (!existingUser?.emailVerified) {
        return false;
      }

      // Check if user has 2FA enabled
      const twoFactorData = await db.query.userTwoFactor.findFirst({
        where: eq(schema.userTwoFactor.userId, user.id),
      });

      if (twoFactorData?.enabled) {
        // Check if this is a 2FA-verified sign-in
        if ((user as typeof user & { _2faVerified?: boolean })._2faVerified) {
          // 2FA verification completed, allow sign-in
          return true;
        }

        // Check if there's a verified auth session
        const { getAuthSession } = await import("@/lib/auth");
        const authSession = await getAuthSession();

        if (authSession?.verified && authSession.userId === user.id) {
          // 2FA verification completed, allow sign-in
          return true;
        } else {
          // 2FA required but not verified, create auth session and block sign-in
          const { createAuthSession } = await import("@/lib/auth");
          await createAuthSession(user.id, user.email || "", "credentials");
          return false;
        }
      }

      return true;
    },
  },
});
