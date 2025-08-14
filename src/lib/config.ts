import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

import { env } from "@/lib/env";
import { authLogger, logError } from "@/lib/logger";

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
      logError(authLogger, "Failed to fetch ORCID person data", error, {
        orcidId: profile.sub,
        endpoint: personApiEndpoint,
      });
    }
    return { id: profile.sub, name: profile.name, email: profile.email, image: null };
  },
  clientId: env.ORCID_CLIENT_ID,
  clientSecret: env.ORCID_CLIENT_SECRET,
};

// Mail configuration
const mailDomain = new URL(env.NEXT_PUBLIC_APP_URL).hostname;

// Determine if the application is running in a development environment.
const isDevelopment = env.NODE_ENV === "development";

const serverConfig = {
  aws: {
    s3BucketName: env.AWS_BUCKET_NAME,
    bucketRegion: env.AWS_BUCKET_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  redis: {
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  },
  mail: {
    domain: mailDomain,
    fromAddress: isDevelopment
      ? "MortiScope <onboarding@resend.dev>"
      : `MortiScope <noreply@${mailDomain}>`,
    resendApiKey: env.RESEND_API_KEY,
    contactEmail: env.CONTACT_EMAIL,
  },
  auth: {
    secret: env.AUTH_SECRET,
    /**
     * Lightweight auth configuration for Edge Runtime compatibility
     * This excludes heavy dependencies like bcryptjs and database operations
     */
    config: {
      session: { strategy: "jwt" },
      providers: [
        ORCIDProvider,
        Google({
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          allowDangerousEmailAccountLinking: true,
        }),
        MicrosoftEntraID({
          clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
          clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
          issuer: `https://login.microsoftonline.com/${env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
          allowDangerousEmailAccountLinking: true,
        }),
      ],
      callbacks: {
        async session({ token, session }) {
          if (token.sub && session.user) {
            session.user.id = token.sub;
          }
          // Preserve the image from the token
          if (token.picture && session.user) {
            session.user.image = token.picture;
          }
          return session;
        },
        async jwt({ token, user, profile }) {
          if (user) {
            token.sub = user.id;
          }
          // Store profile image in token for OAuth providers
          if (profile?.picture) {
            token.picture = profile.picture;
          }
          return token;
        },
      },
    } as NextAuthConfig,
  },
  inngest: {
    eventKey: env.INNGEST_EVENT_KEY,
    signingKey: env.INNGEST_SIGNING_KEY,
  },
  fastapi: {
    url: env.NEXT_PUBLIC_FASTAPI_URL,
    secretKey: env.FASTAPI_SECRET_KEY,
  },
};

// Export the validated server config object.
// Environment validation is handled in env.ts at module load time
export const config = serverConfig;
