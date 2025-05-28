import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { getUserByEmail, getUserById } from "@/data/user";
import { db } from "@/db";
import { SignInSchema } from "@/lib/schemas/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Specifies the Drizzle ORM adapter, linking NextAuth to the application's database schema
  adapter: DrizzleAdapter(db),
  // Configures the session strategy to use JSON Web Tokens (JWT)
  session: { strategy: "jwt" },
  providers: [
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

          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    /**
     * Acts as a gatekeeper for sign-in attempts
     */
    async signIn({ user, account }) {
      if (!user.id) return false;

      // Allow OAuth providers to sign in without email verification check
      if (account?.provider !== "credentials") {
        return true;
      }

      // For credential-based sign-in, block the user if their email is not verified
      const existingUser = await getUserById(user.id);
      if (!existingUser?.emailVerified) {
        return false;
      }

      return true;
    },

    /**
     * Enrich the session object with data from the JWT
     */
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
