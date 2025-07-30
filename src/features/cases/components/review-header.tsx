import { motion, type Variants } from "framer-motion";
import React, { memo } from "react";

import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Defines the props for the review header component.
 */
interface ReviewHeaderProps {
  /** Framer Motion variants for the entrance animation. */
  variants: Variants;
}

/**
 * A memoized component that renders the static header for the review and submit step.
 * Its entrance is animated using Framer Motion variants passed via props.
 *
 * @param {ReviewHeaderProps} props The props for the component.
 * @returns A React component representing the animated header.
 */
export const ReviewHeader = memo(({ variants }: ReviewHeaderProps) => {
  return (
    <motion.div variants={variants}>
      <CardHeader className="px-0 text-center">
        <CardTitle className="font-plus-jakarta-sans text-xl">Review and Submit</CardTitle>
        <CardDescription className="font-inter">
          Carefully review the details and images below before finalzing the submission.
        </CardDescription>
      </CardHeader>
    </motion.div>
  );
});

ReviewHeader.displayName = "ReviewHeader";
