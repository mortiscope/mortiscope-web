import { useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

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
 * A custom hook that manages scroll-driven text reveal state.
 */
export const useScrollReveal = () => {
  /** A ref to a tall, invisible div that acts as the scroll trigger for the text animation. */
  const scrollTarget = useRef<HTMLDivElement>(null);

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

  return {
    currentWord,
    parsedWords,
    scrollTarget,
  };
};
