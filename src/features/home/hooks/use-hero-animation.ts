import { useScroll, useTransform, type Variants } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * A custom hook that encapsulates mount state and animation values for the hero section.
 */
export const useHeroAnimation = () => {
  // State to track if component is mounted to prevent layout issues
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Track scroll position for parallax effect
  const { scrollY } = useScroll();

  // Synchronized upward movement and subtle fade for all hero components
  const textY = useTransform(scrollY, [0, 800], [0, -250]);
  const textOpacity = useTransform(scrollY, [0, 800], [1, 0.4]);

  const imageY = useTransform(scrollY, [0, 800], [0, -250]);
  const imageOpacity = useTransform(scrollY, [0, 800], [1, 0.4]);

  const navY = useTransform(scrollY, [0, 800], [0, -250]);
  const navOpacity = useTransform(scrollY, [0, 800], [1, 0.4]);

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

  return {
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
  };
};
