import type { MetadataRoute } from "next";

/**
 * The default exported function that Next.js will execute at build time to create the `robots.txt` file.
 * @returns An object conforming to the `MetadataRoute.Robots` type, which defines the rules for crawlers.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    // Defines the set of access rules for web crawlers.
    rules: [
      {
        /**
         * The user agent this rule applies to. `*` is a wildcard that means this rule applies to all web crawlers.
         */
        userAgent: "*",
        /**
         * The default instruction, allowing crawlers to access the site root and any page not explicitly disallowed.
         */
        allow: "/",
        /**
         * An array of paths that all crawlers are instructed *not* to crawl.
         */
        disallow: [
          // Disallow all API routes as they do not serve content for search indexing.
          "/api/",
          // Disallow all authentication-related pages as they have no SEO value.
          "/signin",
          "/signin/",
          "/signup",
          "/forgot-password",
          "/reset-password",
          "/verification",
          // Disallow all private routes that require a user to be logged in.
          "/account",
          "/analyze",
          "/dashboard",
          "/results",
        ],
      },
    ],
    /**
     * Specifies the absolute URL of the sitemap.xml file.
     */
    sitemap: "https://mortiscope.com/sitemap.xml",
  };
}
