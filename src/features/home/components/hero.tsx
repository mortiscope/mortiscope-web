"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CustomCursor } from "@/components/custom-cursor";
import { Button } from "@/components/ui/button";
import { NavigationBar } from "@/features/home/components/navigation-bar";

const Hero = () => {
  // Reference for the hero section, used by the custom cursor component
  const heroSectionRef = useRef<HTMLElement>(null);
  // State to track if component is mounted to prevent layout issues
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Defines the main fade-in animation for the entire hero section
  const heroVariant: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { duration: 1.2, ease: "easeInOut" },
    },
  };

  // A container variant for staggering the animation of child elements
  const contentStaggerContainer: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: 0.7,
        staggerChildren: 0.3,
      },
    },
  };

  // A reusable variant for animating elements sliding in from the left
  const slideInFromLeft: Variants = {
    hidden: { x: -50, opacity: 0 },
    show: {
      x: 0,
      opacity: 1,
      transition: { duration: 1, ease: "easeOut" },
    },
  };

  // Defines the animation for the hand image, making it scale and fade into view
  const handVariant: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 40 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: 1.0,
        duration: 1.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  // Defines the animation for the fly image, making it appear after the hand
  const flyVariant: Variants = {
    hidden: { opacity: 0, scale: 0.5 },
    show: {
      opacity: 1,
      scale: 1,
      transition: {
        delay: 1.8,
        duration: 1.0,
        ease: "easeOut",
      },
    },
  };

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
        <motion.div
          className="absolute inset-0 -top-[10%] -left-[10%] z-[-1] h-[120%] w-[120%] bg-[url('/images/background.png')] bg-cover bg-center bg-no-repeat"
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

        {/* Navigation bar */}
        <NavigationBar animated={true} />

        {/* Hero Content Area */}
        <div className="container mx-auto flex flex-grow items-center px-4 py-10 sm:px-6 lg:px-6 2xl:px-32">
          {/* Grid layout for hero content */}
          <div className="grid w-full grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
            <motion.div
              className="flex flex-col justify-center space-y-6 text-center md:space-y-8 md:text-left"
              variants={contentStaggerContainer}
              initial="hidden"
              animate={isMounted ? "show" : "hidden"}
            >
              <motion.h1
                className="font-plus-jakarta-sans cursor-text text-5xl font-black uppercase lg:text-7xl"
                variants={slideInFromLeft}
              >
                <span className="text-green-800">Insect </span>
                <span className="text-slate-900">
                  hold the <i>clues</i>
                </span>
                <span className="text-amber-400">.</span>
              </motion.h1>
              <motion.p
                className="font-inter text-base leading-relaxed text-slate-900 md:text-lg lg:text-xl"
                variants={slideInFromLeft}
              >
                Mortiscope simplifies oriental latrine fly&apos;s growth analysis, reducing time
                spent on manual examination. As a supplemental forensic tool, it enhances accuracy
                and supports forensic scientists in estimating time of death efficiently.
              </motion.p>
              <motion.div variants={slideInFromLeft}>
                <Link href="/signup">
                  <Button className="font-plus-jakarta-sans relative cursor-pointer overflow-hidden rounded-lg border-none bg-yellow-500 px-4 py-4 text-sm font-medium tracking-wide text-white uppercase transition-all duration-200 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-green-700 before:to-green-600 before:transition-all before:duration-500 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-amber-500 hover:text-white hover:before:left-0 md:px-5 md:py-5 md:text-base lg:px-6 lg:py-6 lg:text-lg">
                    Start Analysis
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right-side Content */}
            <div className="relative order-last flex h-full min-h-[300px] items-end justify-center sm:min-h-[350px] md:order-none md:min-h-[400px] lg:min-h-[550px] xl:min-h-[600px] 2xl:min-h-[650px]">
              {/* Container for the hand image */}
              <div className="absolute bottom-[-95%] left-1/2 w-[145%] max-w-none -translate-x-1/2 sm:bottom-[-100%] sm:w-[155%] md:bottom-[-85%] md:w-[180%] lg:bottom-[-115%] lg:w-[180%] xl:bottom-[-90%] xl:w-[160%] 2xl:bottom-[-80%] 2xl:w-[140%]">
                <motion.div
                  className="relative z-10 -rotate-12 transform md:-rotate-15"
                  variants={handVariant}
                  initial="hidden"
                  animate={isMounted ? "show" : "hidden"}
                >
                  <Image
                    src="/images/hand.png"
                    alt="Hand reaching out the fly"
                    width={1422}
                    height={1800}
                    className="h-auto w-full object-contain"
                    priority
                  />
                </motion.div>

                <motion.div
                  className="absolute bottom-[80%] left-[55%] z-20 w-[45%] max-w-md -translate-x-1/2 sm:bottom-[55%] sm:w-[50%] md:bottom-[85%] md:w-[55%] lg:bottom-[85%] lg:w-[45%] xl:bottom-[90%] xl:w-[50%] 2xl:bottom-[90%] 2xl:w-[55%]"
                  variants={flyVariant}
                  initial="hidden"
                  animate={isMounted ? "show" : "hidden"}
                >
                  <motion.div
                    animate={isMounted ? { y: [0, -10, 0] } : { y: 0 }}
                    transition={{
                      duration: 3.5,
                      ease: "easeInOut",
                      repeat: Infinity,
                    }}
                  >
                    <Image
                      src="/images/chrysomya-megacephala.png"
                      alt="Chrysomya Megacephala fly"
                      width={698}
                      height={465}
                      className="h-auto w-full object-contain"
                      priority
                    />
                  </motion.div>
                </motion.div>
              </div>
            </div>
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
