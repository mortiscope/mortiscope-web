"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

import { CustomCursor } from "@/components/custom-cursor";
import { HeroContent } from "@/features/home/components/hero-content";
import { HeroImageDisplay } from "@/features/home/components/hero-image-display";
import { NavigationBar } from "@/features/home/components/navigation-bar";
import { useHeroAnimation } from "@/features/home/hooks/use-hero-animation";

const Hero = () => {
  // Reference for the hero section, used by the custom cursor component
  const heroSectionRef = useRef<HTMLElement>(null);
  const {
    isMounted,
    textY,
    textOpacity,
    imageY,
    imageOpacity,
    navY,
    navOpacity,
    heroVariant,
    contentStaggerContainer,
    slideInFromLeft,
    handVariant,
    flyVariant,
  } = useHeroAnimation();

  // Prevent rendering until mounted to avoid layout issues
  if (!isMounted) {
    return (
      <section className="relative flex min-h-auto w-full flex-col overflow-hidden opacity-0">
        <div className="absolute inset-0 z-[-1] bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat" />
        <div className="container mx-auto flex items-center justify-between px-4 py-6 sm:px-6 lg:px-6">
          <div className="flex items-center">
            <Image
              src="/logos/logo.svg"
              alt="Mortiscope Logo"
              width={50}
              height={50}
              priority
              style={{ width: "auto", height: "auto" }}
            />
            <span className="font-plus-jakarta-sans ml-2 text-2xl font-semibold tracking-tight md:text-3xl">
              <span className="text-green-800">MORTI</span>
              <span className="text-slate-800">SCOPE</span>
              <span className="text-amber-400">.</span>
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <motion.section
        ref={heroSectionRef}
        className="relative flex min-h-auto w-full flex-col overflow-hidden"
        aria-label="Hero background image"
        variants={heroVariant}
        initial="hidden"
        animate={isMounted ? "show" : "hidden"}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 z-[-1]">
          <motion.div
            className="absolute inset-0 -top-[10%] -left-[10%] h-[120%] w-[120%] bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat"
            animate={
              isMounted
                ? {
                    scale: [1, 1.15, 1],
                    x: [0, -40, 0],
                    y: [0, -30, 0],
                  }
                : {}
            }
            transition={{
              duration: 12,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "loop",
            }}
          />
        </div>

        {/* Navigation bar items move upward in sync */}
        <motion.div style={{ y: navY, opacity: navOpacity }}>
          <NavigationBar animated={true} />
        </motion.div>

        {/* Hero Content Area */}
        <div className="container mx-auto flex flex-grow items-center px-4 py-10 sm:px-6 lg:px-6 2xl:px-32">
          {/* Grid layout for hero content */}
          <div className="grid w-full grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
            <HeroContent
              isMounted={isMounted}
              textY={textY}
              textOpacity={textOpacity}
              contentStaggerContainer={contentStaggerContainer}
              slideInFromLeft={slideInFromLeft}
            />

            {/* Right-side Content */}
            <HeroImageDisplay
              isMounted={isMounted}
              imageY={imageY}
              imageOpacity={imageOpacity}
              handVariant={handVariant}
              flyVariant={flyVariant}
            />
          </div>
        </div>
      </motion.section>

      {/* Custom Cursor component, active within the heroSectionRef area */}
      <CustomCursor
        containerRef={heroSectionRef}
        iconClassName="brightness-0 invert"
        iconSrc="/icons/icon-fly.svg"
        iconSize={32}
        className="h-18 w-18 bg-slate-800 shadow-xl"
      />
    </>
  );
};

Hero.displayName = "Hero";

export default Hero;
