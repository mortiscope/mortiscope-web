import { motion, type Variants } from "framer-motion";
import React, { memo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Defines the props required by the review details summary component.
 */
interface ReviewDetailsSummaryProps {
  /** The name of the case, which is optional. */
  caseName?: string;
  /** The pre-formatted string for displaying the temperature. */
  temperatureDisplay: string;
  /** The pre-formatted string for displaying the case date. */
  caseDateDisplay: string;
  /** The pre-formatted string for displaying the location. */
  locationDisplay: string;
  /** Framer Motion variants passed from the parent for container-level animations. */
  variants: Variants;
}

/**
 * A memoized component that displays a summary of the key analysis case details.
 * Its entrance is animated using Framer Motion variants passed via props.
 */
export const ReviewDetailsSummary = memo(
  ({
    caseName,
    temperatureDisplay,
    caseDateDisplay,
    locationDisplay,
    variants,
  }: ReviewDetailsSummaryProps) => {
    return (
      // The main animated container for the details summary card.
      <motion.div variants={variants}>
        <Card className="rounded-2xl border-2 border-slate-200 shadow-none">
          <CardHeader className="py-0 text-center md:text-left">
            <CardTitle className="font-plus-jakarta-sans text-lg">Analysis Details</CardTitle>
          </CardHeader>
          <CardContent className="font-inter text-sm">
            {/* This container uses a stacked layout on mobile and transitions to a 2x2 grid on medium screens and up. */}
            <div className="space-y-4 md:grid md:grid-cols-2 md:space-y-0 md:gap-x-8 md:gap-y-4">
              <div className="md:contents">
                <p className="text-muted-foreground font-medium">Case Name</p>
                {/* Provides a fallback for optional data to prevent empty spaces in the interface. */}
                <p className="font-normal">{caseName || "N/A"}</p>
              </div>

              <div className="md:contents">
                <p className="text-muted-foreground font-medium">Temperature</p>
                <p className="font-normal">{temperatureDisplay}</p>
              </div>

              <div className="md:contents">
                <p className="text-muted-foreground font-medium">Case Date</p>
                <p className="font-normal">{caseDateDisplay}</p>
              </div>

              <div className="md:contents">
                <p className="text-muted-foreground font-medium">Location</p>
                <p className="font-normal">{locationDisplay || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

ReviewDetailsSummary.displayName = "ReviewDetailsSummary";
