import type { MetadataRoute } from "next";

/**
 * The default exported function that Next.js will execute at build time to create the sitemap.
 * @returns An array of sitemap entry objects, conforming to the `MetadataRoute.Sitemap` type.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // The base URL of the production website, used to construct absolute URLs for each page.
  const baseUrl = "https://mortiscope.com";

  // The array of all public pages to be included in the sitemap.
  return [
    {
      /** The absolute URL of the page. */
      url: baseUrl,
      /** The date the page was last modified. Using `new Date()` sets it to the build time. */
      lastModified: new Date(),
      /** An optional hint to search engines about how frequently the page is likely to change. */
      changeFrequency: "monthly",
      /** The priority of this URL relative to other URLs on the site. */
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-use`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
