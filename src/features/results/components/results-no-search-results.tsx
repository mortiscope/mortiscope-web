import { motion } from "framer-motion";
import React, { memo } from "react";
import { HiOutlineSearch } from "react-icons/hi";

/**
 * An animated component that renders a message when a search query yields no results.
 */
export const ResultsNoSearchResults = memo(() => {
  return (
    <motion.div
      key="no-results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      <HiOutlineSearch className="h-16 w-16 text-slate-300" />
      <h3 className="font-plus-jakarta-sans mt-4 text-xl font-semibold text-slate-800">
        No Cases Found
      </h3>
      <p className="font-inter mt-1 max-w-sm text-sm break-all text-slate-500">
        Your search term did not match any cases.
      </p>
    </motion.div>
  );
});

ResultsNoSearchResults.displayName = "ResultsNoSearchResults";
