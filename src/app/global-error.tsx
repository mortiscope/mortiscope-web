"use client";

import * as Sentry from "@sentry/nextjs";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { CustomCursor } from "@/components/custom-cursor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["800"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Capture the error in Sentry
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  // Create a ref for the section element to define the custom cursor's active area
  const errorSectionRef = useRef<HTMLElement>(null);

  return (
    <>
      <body className={cn(inter.variable, plusJakartaSans.variable, "font-sans")}>
        {/* Main section container, now with the ref attached */}
        <section
          ref={errorSectionRef}
          className="flex min-h-screen w-full items-center justify-center overflow-hidden bg-[url('/images/painting-texture-overlay.png')] bg-cover bg-center bg-no-repeat p-4"
          aria-label="An Error Occurred"
        >
          {/* Relative container to position the background fly image */}
          <div className="relative flex items-center justify-center">
            <Image
              src="/images/chrysomya-megacephala.png"
              alt="Chrysomya Megacephala fly"
              width={698}
              height={465}
              className="absolute top-1/2 left-1/2 z-0 h-auto w-80 -translate-x-1/2 -translate-y-1/2 opacity-20 md:w-96 lg:w-[32rem] xl:w-[40rem]"
              priority
            />

            <div className="relative z-10 flex flex-col items-center justify-center space-y-6 text-center md:space-y-8">
              {/* Logo with Title for brand consistency */}
              <div className="flex items-center">
                <Image src="/logos/logo.svg" alt="Mortiscope Logo" width={60} height={60} />
                <span className="font-inter ml-3 text-3xl font-bold tracking-tighter md:text-4xl">
                  <span className="text-green-800">MORTI</span>
                  <span className="text-slate-800">SCOPE</span>
                  <span className="text-amber-400">.</span>
                </span>
              </div>

              {/* Error Heading */}
              <h1 className="font-plus-jakarta-sans cursor-text text-5xl font-black uppercase lg:text-7xl">
                <span className="text-green-800">Something Went Wrong</span>
              </h1>

              {/* Helper Description */}
              <p className="font-inter max-w-xl text-base leading-relaxed text-slate-900 md:text-lg lg:text-xl">
                Oops! It seems we&apos;ve hit a snag. A technical error occurred. You can try again
                or return to the homepage.
              </p>

              {/* Call-to-Action Buttons */}
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <Button
                  onClick={() => reset()}
                  className="font-inter relative w-full cursor-pointer overflow-hidden rounded-lg border-none bg-yellow-500 px-4 py-4 text-sm font-normal text-white uppercase transition-all duration-200 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-green-700 before:to-green-600 before:transition-all before:duration-500 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-amber-500 hover:text-white hover:before:left-0 sm:w-auto md:px-5 md:py-5 md:text-base lg:px-6 lg:py-6 lg:text-lg"
                >
                  Try Again
                </Button>

                <Link href="/">
                  <Button className="font-inter relative w-full cursor-pointer overflow-hidden rounded-lg border-none bg-green-700 px-4 py-4 text-sm font-normal text-white uppercase transition-all duration-200 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-500 before:to-amber-500 before:transition-all before:duration-500 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-green-600 hover:text-white hover:before:left-0 sm:w-auto md:px-5 md:py-5 md:text-base lg:px-6 lg:py-6 lg:text-lg">
                    Return to Home
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Custom Cursor component, active within the errorSectionRef area */}
        <CustomCursor
          containerRef={errorSectionRef}
          iconSrc="/icons/icon-error.svg"
          iconSize={32}
          className="h-18 w-18 bg-slate-800 shadow-xl"
          iconClassName="brightness-0 invert"
        />
      </body>
    </>
  );
}
