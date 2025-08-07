import { AnimatePresence, motion, type Variants } from "framer-motion";
import { memo } from "react";
import { ImSpinner2 } from "react-icons/im";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the animation for the text transition inside the buttons.
 * The text will slide up/down and fade in/out.
 */
const textVariants: Variants = {
  initial: { y: 10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 },
};

type ExportModalFooterProps = {
  isPending: boolean;
  onCancel: () => void;
  onExport: () => void;
  exportButtonText?: string;
  cancelButtonText?: string;
  backButtonText?: string;
  pendingButtonText?: string;
  showBackButton?: boolean;
  disabled?: boolean;
};

/**
 * Renders a standardized footer with Cancel/Back and Export/Next buttons for modals.
 */
export const ExportModalFooter = memo(
  ({
    isPending,
    onCancel,
    onExport,
    exportButtonText = "Export",
    cancelButtonText = "Cancel",
    backButtonText = "Back",
    pendingButtonText = "Exporting...",
    showBackButton = false,
    disabled = false,
  }: ExportModalFooterProps) => {
    const isButtonDisabled = isPending || disabled;

    return (
      <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
        <DialogFooter className="flex w-full flex-row gap-3">
          <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
              className="font-inter h-10 w-full cursor-pointer overflow-hidden uppercase transition-all duration-300 ease-in-out hover:bg-slate-100 disabled:cursor-not-allowed"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={showBackButton ? backButtonText : cancelButtonText}
                  variants={textVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ ease: "easeInOut", duration: 0.2 }}
                  className="block"
                >
                  {showBackButton ? backButtonText : cancelButtonText}
                </motion.span>
              </AnimatePresence>
            </Button>
          </div>
          <div className={cn("flex-1", isButtonDisabled && "cursor-not-allowed")}>
            <Button
              onClick={onExport}
              disabled={isButtonDisabled}
              className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden bg-emerald-600 text-white uppercase transition-all duration-300 ease-in-out hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <ImSpinner2 className="h-5 w-5 animate-spin" />
                  <span className="sr-only">Export started successfully.</span>{" "}
                  <span>{pendingButtonText}</span>
                </>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={exportButtonText}
                    variants={textVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ ease: "easeInOut", duration: 0.2 }}
                    className="block"
                  >
                    {exportButtonText}
                  </motion.span>
                </AnimatePresence>
              )}
            </Button>
          </div>
        </DialogFooter>
      </motion.div>
    );
  }
);

ExportModalFooter.displayName = "ExportModalFooter";
