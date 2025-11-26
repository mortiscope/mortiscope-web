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
 * Defines the comprehensive structure for all server-side configurations.
 */
type ServerConfig = {
  aws: {
    s3BucketName: string;
    bucketRegion: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  redis: { url: string; token: string };
  mail: {
    domain: string;
    fromAddress: string;
    resendApiKey: string;
    contactEmail: string;
  };
  auth: { secret: string; config: NextAuthConfig };
  inngest: { eventKey: string | undefined; signingKey: string | undefined };
  fastapi: { url: string; secretKey: string };
};

/**
 * A private, module-level variable to cache the singleton `ServerConfig` instance.
 * It is initialized as `undefined` and populated on the first access.
 */
let _config: ServerConfig | undefined;

/**
 * A factory function that builds the complete server configuration object.
 * It reads from environment variables (`env`), defines custom logic,
 * and structures the configuration into a typed `ServerConfig` object.
 * @returns The fully constructed `ServerConfig` object.
 */
function buildConfig(): ServerConfig {
  const appUrl = env.NEXT_PUBLIC_APP_URL || "https://placeholder.example.com";
  const mailDomain = env.RESEND_MAIL_DOMAIN ?? new URL(appUrl).hostname;
  const isDevelopment = env.NODE_ENV === "development";

  /**
   * Defines a custom OAuth provider for ORCID, including endpoints and a `profile`
   * callback to fetch additional user details (like full name) from a secondary API endpoint.
   */
  const ORCIDProvider = {
    id: "orcid",
    name: "ORCID",
    type: "oauth" as const,
    authorization: {
      url: "https://orcid.org/oauth/authorize",
      params: {
        scope: "/authenticate",
      },
    },
    token: "https://orcid.org/oauth/token",
    userinfo: "https://orcid.org/oauth/userinfo",
    /**
     * The `profile` callback for fetching the user's full name from the ORCID public API.
     */
    async profile(profile: OrcidProfile, tokens: { access_token?: string }) {
      const personApiEndpoint = `https://pub.orcid.org/v3.0/${profile.sub}/person`;

      try {
        const personResponse = await fetch(personApiEndpoint, {
          headers: { Accept: "application/json", Authorization: `Bearer ${tokens.access_token}` },
        });

        if (personResponse.ok) {
          const personData = await personResponse.json();
          // Safely extract the given and family names.
          const givenName = personData.name?.["given-names"]?.value || "";
          const familyName = personData.name?.["family-name"]?.value || "";
          const fullName = [givenName, familyName].join(" ").trim();

          // Return the enriched profile information required by NextAuth.js.
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
      // Fallback to the basic profile if the secondary API call fails.
      return { id: profile.sub, name: profile.name, email: profile.email, image: null };
    },
    clientId: env.ORCID_CLIENT_ID,
    clientSecret: env.ORCID_CLIENT_SECRET,
  };

  // Construct the final, structured configuration object.
  return {
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
      // Use a different "from" address in development to avoid deliverability issues.
      fromAddress: isDevelopment
        ? "MortiScope <onboarding@resend.dev>"
        : `MortiScope <noreply@${mailDomain}>`,
      resendApiKey: env.RESEND_API_KEY,
      contactEmail: env.NEXT_PUBLIC_CONTACT_EMAIL,
    },
    auth: {
      secret: env.AUTH_SECRET,
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
          /**
           * The `session` callback enriches the client-side session object with data from the JWT.
           * It adds the user's ID and also fetches the latest user data (name, email, image) from the database.
           */
          async session({ token, session }) {
            if (token.sub && session.user) {
              session.user.id = token.sub;

              try {
                // Dynamically import data-access functions to avoid circular dependencies.
                const { getUserById } = await import("@/data/user");
                const dbUser = await getUserById(token.sub);

                // If the user is found in the DB, update the session with the latest data.
                if (dbUser) {
                  session.user.image = dbUser.image || token.picture || null;
                  session.user.name = dbUser.name;
                  session.user.email = dbUser.email;
                }
              } catch {
                // Fallback to the token's picture if the DB call fails.
                if (token.picture && session.user) {
                  session.user.image = token.picture;
                }
              }
            }
            return session;
          },
          /**
           * The `jwt` callback is invoked when a JSON Web Token is created or updated.
           * It's used here to persist the user's ID (`sub`) and profile picture in the token.
           */
          async jwt({ token, user, profile }) {
            if (user) {
              token.sub = user.id;
            }
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
}

/**
 * The exported, lazily-initialized singleton configuration object for the application.
 */
export const config: ServerConfig = new Proxy({} as ServerConfig, {
  get(_, prop) {
    // On first access, call `buildConfig` and cache the result. On subsequent accesses, use the cached `_config` value.
    const target = (_config ??= buildConfig());
    // Return the requested property from the now-initialized config object.
    return (target as unknown as Record<string | symbol, unknown>)[prop];
  },
});
