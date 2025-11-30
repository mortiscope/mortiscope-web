"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Balancer from "react-wrap-balancer";

import { CustomCursor } from "@/components/custom-cursor";
import ShinyText from "@/components/shiny-text";
import SpotlightCard from "@/components/spotlight-card";
import { cn } from "@/lib/utils";

/** The base text content for the animated description. */
const description =
  "An experimental intelligent web-based application system that estimates how long a person has been deceased by analyzing the developmental stage of Chrysomya megacephala specimens found at a scene.";

/** Splits the description into individual words for mapping and animation. */
const words = description.split(" ");

/**
 * Processes the words array into a structured format for rendering.
 */
const parsedWords = words.map((word) => {
  const wordText = word.replace(/[.,!?;:]/g, "").trim();
  const isChrysomyaMegacephala = wordText === "Chrysomya" || wordText === "megacephala";
  return {
    word,
    baseClass: "",
    activeClass: isChrysomyaMegacephala ? "text-amber-400" : "text-slate-800",
    isFlyWord: isChrysomyaMegacephala,
  };
});

/**
 * A smart presentational component for the introduction section.
 */
const Introduction = () => {
  /** A ref to a tall, invisible div that acts as the scroll trigger for the text animation. */
  const scrollTarget = useRef<HTMLDivElement>(null);
  /** A ref to the main section container, used to scope the custom cursor. */
  const introductionSectionRef = useRef<HTMLElement>(null);

  /** Initializes Framer Motion's `useScroll` to track the scroll progress of the `scrollTarget` element. */
  const { scrollYProgress } = useScroll({
    target: scrollTarget,
    offset: ["start end", "end end"],
  });

  /** State to track the index of the word currently being highlighted by the scroll animation. */
  const [currentWord, setCurrentWord] = useState(0);
  /** Maps the `scrollYProgress` to the index of the `parsedWords` array. */
  const wordIndex = useTransform(scrollYProgress, [0, 1], [0, parsedWords.length]);

  /** A side effect that subscribes to changes in the transformed scroll value and updates the `currentWord` state. */
  useEffect(() => {
    const unsubscribe = wordIndex.on("change", (value) => {
      setCurrentWord(value);
    });
    return () => unsubscribe();
  }, [wordIndex]);

  /** State to track if the user is currently hovering over one of the designated fly words. */
  const [isHoveringFly, setIsHoveringFly] = useState(false);
  /** A ref to the DOM element of the fly image. */
  const flyImageRef = useRef<HTMLDivElement>(null);
  /** A ref to store the `requestAnimationFrame` ID for cleanup. */
  const flyAnimRef = useRef<number | null>(null);
  /** A ref to store the latest cursor coordinates without causing re-renders on every mouse move. */
  const flyPosRef = useRef({ x: -200, y: -200 });

  /**
   * A side effect that sets up a high-performance animation loop using `requestAnimationFrame`.
   */
  useEffect(() => {
    const loop = () => {
      if (flyImageRef.current) {
        flyImageRef.current.style.transform = `translate3d(${flyPosRef.current.x}px, ${flyPosRef.current.y}px, 0)`;
      }
      flyAnimRef.current = requestAnimationFrame(loop);
    };
    flyAnimRef.current = requestAnimationFrame(loop);
    // Cleanup the animation frame on unmount.
    return () => {
      if (flyAnimRef.current) {
        cancelAnimationFrame(flyAnimRef.current);
      }
    };
  }, []);

  /** A derived boolean to determine if the scroll progress has reached the fly words. */
  const flyWordsActive = currentWord > 22;
  /** Determines if the fly image should be visible based on both hover state and scroll progress. */
  const showFlyImage = isHoveringFly && flyWordsActive;

  return (
    <section
      ref={introductionSectionRef}
      className="relative z-10 mt-72 w-full bg-green-50 py-24 sm:mt-80 sm:py-32 md:mt-0 md:py-48"
    >
      <div className="container mx-auto px-4">
        {/* The main sticky container that holds the animated content. */}
        <div className="sticky top-40 flex flex-col items-center justify-center md:top-48">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="flex flex-col items-center justify-center gap-8 md:flex-row md:gap-12 lg:gap-20"
          >
            {/* The animated logo card section. */}
            <div className="flex shrink-0">
              <div className="group relative aspect-square w-[140px] cursor-pointer sm:w-[160px] md:aspect-[17/21] md:w-[220px] lg:w-[320px]">
                <div className="absolute inset-0 z-0 rounded-[2rem] bg-amber-300 shadow-[0_0_30px_2px_rgba(5,150,105,0.4)] transition-all duration-500 group-hover:rotate-[10deg] group-hover:shadow-[0_0_30px_2px_rgba(251,191,36,0.4)] md:rounded-[3rem]" />
                <SpotlightCard
                  className="relative z-10 flex h-full w-full flex-col rounded-[2rem] bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-800 md:rounded-[3rem]"
                  spotlightColor="rgba(251, 191, 36, 0.5)"
                >
                  <div className="relative z-20 flex h-full w-full flex-col items-center justify-center">
                    <Image
                      src="/logos/logo.svg"
                      alt="Mortiscope Logo"
                      width={150}
                      height={150}
                      className="h-auto w-16 sm:w-20 md:w-28 lg:w-[150px]"
                    />
                  </div>
                </SpotlightCard>
              </div>
            </div>

            {/* The main text content section. */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left">
              <ShinyText
                text="What is Mortiscope?"
                className="font-plus-jakarta-sans cursor-text text-xl font-medium sm:text-2xl md:text-2xl lg:text-4xl"
                color="#047857"
                shineColor="#34d399"
                speed={3}
              />
              <div className="font-plus-jakarta-sans mt-4 max-w-3xl cursor-text text-2xl font-semibold text-pretty md:max-w-4xl md:text-3xl lg:max-w-7xl lg:text-5xl">
                {/* Ensures the text wraps cleanly without creating typographic widows. */}
                <Balancer>
                  <span className="text-slate-200">
                    {/* Renders the description, applying the active class to words based on scroll progress. */}
                    {parsedWords.map((item, index) => (
                      <span
                        key={index}
                        className={cn(
                          item.baseClass,
                          "transition-colors duration-500",
                          index < currentWord && item.activeClass
                        )}
                        onMouseEnter={item.isFlyWord ? () => setIsHoveringFly(true) : undefined}
                        onMouseLeave={item.isFlyWord ? () => setIsHoveringFly(false) : undefined}
                        onMouseMove={
                          item.isFlyWord
                            ? (e) => {
                                // Updates the ref with the latest cursor position for the animation loop.
                                flyPosRef.current = { x: e.clientX, y: e.clientY };
                              }
                            : undefined
                        }
                      >
                        {`${item.word} `}
                      </span>
                    ))}
                  </span>
                </Balancer>
              </div>
            </div>
          </motion.div>
        </div>
        {/* This tall, invisible div acts as the scrollable area that drives the text animation. */}
        <div className="h-[150vh]" ref={scrollTarget} />
      </div>

      {/* Custom Cursor component, active within the introductionSectionRef area */}
      <CustomCursor
        containerRef={introductionSectionRef}
        iconClassName="brightness-0 invert"
        iconSrc="/icons/icon-information.svg"
        iconSize={32}
        className="h-18 w-18 bg-slate-800 shadow-xl"
      />

      {/* The container for the cursor-following fly image. */}
      <div
        ref={flyImageRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          pointerEvents: "none",
          zIndex: 10000,
          willChange: "transform",
        }}
      >
        <div style={{ transform: "translate(-50%, calc(-100% - 14px))" }}>
          <div
            className={cn(
              "origin-bottom transition-all duration-200 ease-out",
              showFlyImage ? "scale-100 opacity-100" : "scale-0 opacity-0"
            )}
          >
            <Image
              src="/images/chrysomya-megacephala.png"
              alt="Chrysomya megacephala"
              width={220}
              height={160}
              className="pointer-events-none block h-auto w-[160px] sm:w-[180px] lg:w-[220px]"
              priority
              unoptimized
            />
          </div>
        </div>
      </div>
    </section>
  );
};

Introduction.displayName = "Introduction";

export default Introduction;
