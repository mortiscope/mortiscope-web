import { motion, type MotionValue, type Variants } from "framer-motion";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface HeroContentProps {
  isMounted: boolean;
  textY: MotionValue<number>;
  textOpacity: MotionValue<number>;
  contentStaggerContainer: Variants;
  slideInFromLeft: Variants;
}

/**
 * A presentational component for the left-side content of the hero section.
 */
export const HeroContent = ({
  isMounted,
  textY,
  textOpacity,
  contentStaggerContainer,
  slideInFromLeft,
}: HeroContentProps) => {
  return (
    <motion.div
      style={{ y: textY, opacity: textOpacity }}
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
        Mortiscope simplifies oriental latrine fly&apos;s growth analysis, reducing time spent on
        manual examination. As a supplemental forensic tool, it enhances accuracy and supports
        forensic scientists in estimating time of death efficiently.
      </motion.p>
      <motion.div variants={slideInFromLeft}>
        <Link href="/signup">
          <Button className="font-plus-jakarta-sans relative cursor-pointer overflow-hidden rounded-lg border-none bg-yellow-500 px-4 py-4 text-sm font-medium tracking-wide text-white uppercase transition-all duration-200 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-green-700 before:to-green-600 before:transition-all before:duration-500 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-amber-500 hover:text-white hover:before:left-0 md:px-5 md:py-5 md:text-base lg:px-6 lg:py-6 lg:text-lg">
            Start Analysis
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  );
};

HeroContent.displayName = "HeroContent";
