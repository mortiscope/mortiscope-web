import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getUserByEmail, getUserById } from "@/data/user";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { SignInSchema } from "@/features/auth/schemas/auth";
import { config } from "@/lib/config";
import { sendEmailChangeNotification } from "@/lib/mail";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...config.auth.config,
  // Specifies the Drizzle ORM adapter, linking NextAuth to the application's database schema
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
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
          if (!user || !user.password) return null;

          // Special case: 2FA-verified signin
          if (password === "2fa-verified") {
            // Verify that there's a valid verified auth session for this user
            const { getAuthSession } = await import("@/lib/auth");
            const authSession = await getAuthSession();

            if (authSession?.verified && authSession.email === email) {
              return user;
            }
            return null;
          }

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    ...config.auth.config.callbacks,
    /**
     * Handles redirects after sign-in attempts
     */
    async redirect({ url, baseUrl }) {
      // Small delay to ensure auth session is created
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if there's an auth session that needs 2FA verification
      const { hasValidAuthSession } = await import("@/lib/auth");
      const hasAuthSession = await hasValidAuthSession();

      if (hasAuthSession) {
        return `${baseUrl}/signin/two-factor`;
      }

      // Default redirect behavior
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    /**
     * Acts as a gatekeeper for sign-in attempts
     */
    async signIn({ user, account, profile }) {
      if (!user.id) return false;

      // Allow OAuth providers to sign in without email verification check
      if (account?.provider !== "credentials") {
        const providerEmail = profile?.email;
        if (providerEmail && user.email !== providerEmail) {
          console.log(
            `Email for user ${user.id} has changed. Syncing from ${user.email} to ${providerEmail}.`
          );

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
          } catch (error) {
            console.error("Failed to send automatic email change notification:", error);
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
        }

        return true;
      }

      // For credential-based sign-in, block the user if their email is not verified
      const existingUser = await getUserById(user.id);

      if (!existingUser?.emailVerified) {
        return false;
      }

      return true;
    },
  },
});
