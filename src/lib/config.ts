import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// Define the shape of the user profile data returned by ORCID's APIs
interface OrcidProfile {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
}

/**
 * Custom OAuth provider configuration for the production ORCID service.
 */
const ORCIDProvider = {
  id: "orcid",
  name: "ORCID",
  type: "oauth" as const,
  authorization: {
    url: "https://orcid.org/oauth/authorize",
    params: {
      scope: "/authenticate /read-limited",
    },
  },
  token: "https://orcid.org/oauth/token",
  userinfo: "https://orcid.org/oauth/userinfo",
  async profile(profile: OrcidProfile, tokens: { access_token?: string }) {
    const personApiEndpoint = `https://pub.orcid.org/v3.0/${profile.sub}/person`;

    try {
      const personResponse = await fetch(personApiEndpoint, {
        headers: { Accept: "application/json", Authorization: `Bearer ${tokens.access_token}` },
      });

      if (personResponse.ok) {
        const personData = await personResponse.json();
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
    return { id: profile.sub, name: profile.name, email: profile.email, image: null };
  },
  clientId: process.env.ORCID_CLIENT_ID,
  clientSecret: process.env.ORCID_CLIENT_SECRET,
};

// Mail configuration
let mailDomain: string;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

// Determine if the application is running in a development environment.
const isDevelopment = process.env.NODE_ENV === "development";

try {
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set in environment variables.");
  }
  mailDomain = new URL(appUrl).hostname;
} catch (error) {
  console.error(
    "FATAL: Invalid or missing NEXT_PUBLIC_APP_URL. Cannot create 'from' address for emails.",
    error
  );
  mailDomain = "invalid-configuration.local";
}

const serverConfig = {
  aws: {
    s3BucketName: process.env.AWS_BUCKET_NAME,
  },
  mail: {
    domain: mailDomain,
    fromAddress: isDevelopment
      ? "MortiScope <onboarding@resend.dev>"
      : `MortiScope <noreply@${mailDomain}>`,
  },
  auth: {
    /**
     * Lightweight auth configuration for Edge Runtime compatibility
     * This excludes heavy dependencies like bcryptjs and database operations
     */
    config: {
      session: { strategy: "jwt" },
      providers: [
        ORCIDProvider,
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
        MicrosoftEntraID({
          clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
          clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
          issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
          allowDangerousEmailAccountLinking: true,
        }),
      ],
      callbacks: {
        async session({ token, session }) {
          if (token.sub && session.user) {
            session.user.id = token.sub;
          }
          return session;
        },
        async jwt({ token, user }) {
          if (user) {
            token.sub = user.id;
          }
          return token;
        },
      },
    } as NextAuthConfig,
  },
};

// Perform a runtime validation to ensure all required variables are present.
if (!serverConfig.aws.s3BucketName) {
  throw new Error("Missing required server environment variable: AWS_BUCKET_NAME.");
}

// Export the validated server config object.
export const config = serverConfig;
