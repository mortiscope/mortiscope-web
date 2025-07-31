import { motion, type Variants } from "framer-motion";
import { memo } from "react";
import { ImSpinner2 } from "react-icons/im";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

type ExportModalFooterProps = {
  isPending: boolean;
  onCancel: () => void;
  onExport: () => void;
  exportButtonText?: string;
  pendingButtonText?: string;
};

/**
 * Renders a standardized footer with Cancel and Export buttons for modals.
 */
export const ExportModalFooter = memo(
  ({
    isPending,
    onCancel,
    onExport,
    exportButtonText = "Export",
    pendingButtonText = "Exporting...",
  }: ExportModalFooterProps) => (
    <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
      <DialogFooter className="flex w-full flex-row gap-3">
        <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="font-inter h-10 w-full cursor-pointer uppercase transition-all duration-300 ease-in-out hover:bg-slate-100 disabled:cursor-not-allowed"
          >
            Cancel
          </Button>
        </div>
        <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
          <Button
            onClick={onExport}
            disabled={isPending}
            className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 bg-emerald-600 text-white uppercase transition-all duration-300 ease-in-out hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <ImSpinner2 className="h-5 w-5 animate-spin" /> {pendingButtonText}
              </>
            ) : (
              exportButtonText
            )}
          </Button>
        </div>
      </DialogFooter>
    </motion.div>
  )
);

ExportModalFooter.displayName = "ExportModalFooter";
