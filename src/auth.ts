import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import type { OAuthConfig, Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { getUserByEmail, getUserById } from "@/data/user";
import { db } from "@/db";
import { SignInSchema } from "@/lib/schemas/auth";

// Define the shape of the user profile data returned by ORCID's APIs
interface OrcidProfile {
  sub: string;
  name?: string;
  email?: string;
}

/**
 * Custom OAuth provider configuration for the production ORCID service.
 */
const ORCIDProvider: OAuthConfig<OrcidProfile> = {
  // A unique ID for this provider. Must match the callback URL segment.
  id: "orcid",
  // The user-friendly name displayed on the sign-in page.
  name: "ORCID",
  // The 'type' must be the literal "oauth" to match the expected Provider type.
  type: "oauth",
  // The authorization endpoint for the production ORCID environment.
  authorization: {
    url: "https://orcid.org/oauth/authorize",
    params: {
      scope: "/authenticate /read-limited",
    },
  },
  // The token exchange endpoint for the production ORCID environment.
  token: "https://orcid.org/oauth/token",
  // The standard user info endpoint. This provides the ORCID iD (`sub`) and email.
  userinfo: "https://orcid.org/oauth/userinfo",
  /**
   * The 'profile' callback is essential for ORCID because we need to make an
   * additional API call to fetch the user's name from their public record.
   *
   * @param profile The basic user data (sub, email) from the 'userinfo' endpoint.
   * @param tokens The OAuth tokens, including the access_token.
   * @returns A promise resolving to a standardized user object for NextAuth.
   */
  async profile(profile, tokens) {
    // The public name is fetched from a different API endpoint, as per ORCID's documentation.
    const personApiEndpoint = `https://pub.orcid.org/v3.0/${profile.sub}/person`;

    try {
      const personResponse = await fetch(personApiEndpoint, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (personResponse.ok) {
        const personData = await personResponse.json();
        // Extract the name from the detailed person record.
        const givenName = personData.name?.["given-names"]?.value || "";
        const familyName = personData.name?.["family-name"]?.value || "";
        const fullName = [givenName, familyName].join(" ").trim();

        return {
          id: profile.sub,
          name: fullName || profile.name,
          email: profile.email,
          image: null,
        };
      }
    } catch (error) {
      console.error("Failed to fetch ORCID person data:", error);
    }

    // Fallback in case the second API call fails.
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: null,
    };
  },
  // These credentials will be read from your environment variables.
  clientId: process.env.ORCID_CLIENT_ID,
  clientSecret: process.env.ORCID_CLIENT_SECRET,
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Specifies the Drizzle ORM adapter, linking NextAuth to the application's database schema
  adapter: DrizzleAdapter(db),
  // Configures the session strategy to use JSON Web Tokens (JWT)
  session: { strategy: "jwt" },
  providers: [
    // Add the custom ORCID provider to the array.
    ORCIDProvider as Provider, // Cast as Provider to satisfy the array type
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
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
