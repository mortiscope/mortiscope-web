import { motion } from "framer-motion";
import React, { memo } from "react";
import { HiOutlineSearch } from "react-icons/hi";

interface ResultsNoSearchResultsProps {
  /** The main title to display. */
  title: string;
  /** The descriptive text below the title. */
  description: string;
}

/**
 * An animated component that renders a message when a search query yields no results.
 */
export const ResultsNoSearchResults = memo(
  ({ title, description }: ResultsNoSearchResultsProps) => {
    return (
      <motion.div
        key="no-results"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex flex-1 flex-col items-center justify-center py-10 text-center"
      >
        <HiOutlineSearch className="h-12 w-12 text-slate-300" />
        <h3 className="font-plus-jakarta-sans mt-4 text-xl font-semibold text-slate-800">
          {title}
        </h3>
        <p className="font-inter mt-1 max-w-sm text-sm break-all text-slate-500">{description}</p>
      </motion.div>
    );
  }
);

ResultsNoSearchResults.displayName = "ResultsNoSearchResults";
