import Script from "next/script";

/**
 * Defines the props for the `JsonLd` component.
 */
interface JsonLdProps {
  /** Determines which structured data schema to render based on the page type. */
  type: "homepage" | "legal";
}

/**
 * A component that dynamically renders a `<script>` tag with JSON-LD structured data.
 * @param {JsonLdProps} props The props for the component.
 * @returns A Next.js `Script` component containing the appropriate JSON-LD schema.
 */
export function JsonLd({ type }: JsonLdProps) {
  const baseUrl = "https://mortiscope.com";

  /**
   * An object containing the pre-defined JSON-LD schemas for different page types.
   */
  const structuredData = {
    // Schema for the main homepage, describing the web application, its developers, and the website itself.
    homepage: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          "@id": `${baseUrl}/#application`,
          name: "Mortiscope",
          description:
            "An experimental intelligent web-based system that uses computer vision and deep learning to analyze Chrysomya megacephala images for forensic Post-Mortem Interval (PMI) estimation.",
          url: baseUrl,
          applicationCategory: "ScienceApplication",
          operatingSystem: "Web Browser",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
          },
          author: [
            {
              "@type": "Person",
              name: "Precious Rowelyn Andal",
              url: "https://linkedin.com/in/precious-rowelyn-andal-5b6a1a22a",
              sameAs: [
                "https://github.com/cinnamongirl29",
                "https://linkedin.com/in/precious-rowelyn-andal-5b6a1a22a",
              ],
            },
            {
              "@type": "Person",
              name: "Neil Ivan Orencia",
              url: "https://linkedin.com/in/neilivanorencia",
              sameAs: [
                "https://github.com/neilivanorencia",
                "https://linkedin.com/in/neilivanorencia",
              ],
            },
          ],
          keywords: [
            "forensic entomology",
            "PMI estimation",
            "post-mortem interval",
            "Chrysomya megacephala",
            "computer vision",
            "deep learning",
          ],
        },
        {
          "@type": "WebSite",
          "@id": `${baseUrl}/#website`,
          url: baseUrl,
          name: "Mortiscope",
          description: "PMI Estimation System Based on the Life Cycle of Chrysomya megacephala",
          publisher: {
            "@type": "Organization",
            name: "Mortiscope Research Partners",
            sameAs: ["https://github.com/mortiscope"],
          },
        },
      ],
    },
    // A simpler schema for legal pages.
    legal: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      isPartOf: {
        "@id": `${baseUrl}/#website`,
      },
    },
  };

  return (
    // The Next.js Script component is used for optimal loading of the structured data.
    <Script
      id="json-ld"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData[type]),
      }}
    />
  );
}
