import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";
import { GoCheckCircle } from "react-icons/go";
import { LuLoaderCircle, LuRotateCw } from "react-icons/lu";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the upload status icon component.
 */
type StatusIconProps = {
  /** The file object containing the current upload status. */
  file: UploadableFile;
  /** A callback function to trigger a retry for a failed upload. */
  onRetry: (fileId: string) => void;
};

/**
 * Renders an animated status icon based on the file's upload status.
 * For failed uploads, it provides a retry mechanism. This component is memoized
 * for performance optimization within lists.
 */
export const UploadStatusIcon = memo(({ file, onRetry }: StatusIconProps) => {
  /**
   * Defines the animation variants (initial, animate, exit) for the status icons,
   * creating a consistent fade-and-scale effect for transitions.
   */
  const iconVariants = {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.5 },
  };

  const { status, id } = file;

  /**
   * A configuration object that maps each upload status to its corresponding interface properties.
   */
  const statusConfig = {
    uploading: { tooltip: "Uploading", className: "text-slate-500 hover:bg-transparent" },
    success: {
      tooltip: "Upload successful",
      className: "text-emerald-500 hover:bg-emerald-100 hover:text-emerald-600",
    },
    error: { tooltip: "Retry", className: "text-slate-500 hover:bg-rose-100 hover:text-rose-600" },
    pending: { tooltip: "Pending", className: "text-slate-500 hover:bg-slate-100" },
  };

  // Selects the appropriate configuration based on the current file status, with a fallback.
  const currentStatus = statusConfig[status] || statusConfig.uploading;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* The main container for the icon, which also serves as the clickable area. */}
        <div
          className={cn(
            "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors duration-300 ease-in-out",
            currentStatus.className
          )}
          // The click handler is conditional, triggering `on retry` only for the 'error' state.
          onClick={() => {
            if (status === "error") onRetry(id);
          }}
          role="button"
          tabIndex={status === "error" ? 0 : -1}
          aria-label={currentStatus.tooltip}
        >
          <AnimatePresence mode="wait" initial={false}>
            {status === "uploading" && (
              <motion.div
                key="uploading"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <LuLoaderCircle className="h-5 w-5 animate-spin" />
              </motion.div>
            )}
            {status === "success" && (
              <motion.div
                key="success"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <GoCheckCircle className="h-5 w-5" />
              </motion.div>
            )}
            {status === "error" && (
              <motion.div
                key="error"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <LuRotateCw className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-inter">{currentStatus.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
});

UploadStatusIcon.displayName = "UploadStatusIcon";
