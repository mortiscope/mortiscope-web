import "@/app/globals.css";

import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Metadata } from "next/types";

import QueryProvider from "@/components/providers/query-provider";
import { NextAuthSessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mortiscope.com"),
  title: {
    default: "Mortiscope — PMI Estimation System Based on the Life Cycle of Chrysomya megacephala",
    template: "%s | Mortiscope",
  },
  description:
    "Mortiscope is an experimental web application system that uses computer vision and deep learning to analyze Chrysomya megacephala images for Post-Mortem Interval (PMI) estimation.",
  keywords: [
    "forensic entomology",
    "PMI estimation",
    "post-mortem interval",
    "Chrysomya megacephala",
    "time of death estimation",
    "forensic science",
    "computer vision",
    "deep learning",
    "YOLO11",
    "object detection",
    "ADH calculation",
  ],
  authors: [
    {
      name: "Precious Rowelyn Andal",
      url: "https://linkedin.com/in/precious-rowelyn-andal-5b6a1a22a",
    },
    {
      name: "Neil Ivan Orencia",
      url: "https://linkedin.com/in/neilivanorencia",
    },
  ],
  creator: "Mortiscope Research Partners",
  publisher: "Mortiscope",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://mortiscope.com",
    siteName: "Mortiscope",
    title: "Mortiscope — PMI Estimation System Based on the Life Cycle of Chrysomya megacephala",
    description:
      "An experimental intelligent web application that uses computer vision and deep learning to analyze Chrysomya megacephala images for forensic Post-Mortem Interval estimation.",
    images: [
      {
        url: "/seo/opengraph-image-v1.png",
        width: 1200,
        height: 675,
        alt: "Mortiscope — PMI Estimation System Based on the Life Cycle of Chrysomya megacephala",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mortiscope — PMI Estimation System Based on the Life Cycle of Chrysomya megacephala",
    description:
      "An experimental intelligent web application system using computer vision and deep learning for forensic Post-Mortem Interval estimation through Chrysomya megacephala analysis.",
    images: ["/seo/opengraph-image-v1.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [{ rel: "mask-icon", url: "/favicon.svg" }],
  },
  manifest: "/site.webmanifest",
  category: "Science & Technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextAuthSessionProvider>
          <QueryProvider>
            <main>{children}</main>
            <Toaster position="bottom-right" richColors />
          </QueryProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
