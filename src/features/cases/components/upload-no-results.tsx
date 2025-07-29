import { motion } from "framer-motion";
import { memo } from "react";
import { HiOutlineSearch } from "react-icons/hi";

/**
 * Renders an animated message indicating that no files were found for a given search or filter.
 */
export const UploadNoResults = memo(() => {
  return (
    <motion.div
      layout="position"
      key="no-results"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="flex flex-1 flex-col items-center justify-center py-10 text-center"
    >
      <HiOutlineSearch className="h-12 w-12 text-slate-300" />
      <h3 className="font-plus-jakarta-sans mt-4 text-xl font-semibold text-slate-800">
        No Files Found
      </h3>
      <p className="font-inter mt-1 max-w-sm text-sm break-all text-slate-500">
        Your search term did not match any files.
      </p>
    </motion.div>
  );
});

UploadNoResults.displayName = "UploadNoResults";
