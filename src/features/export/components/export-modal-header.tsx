import { motion, type Variants } from "framer-motion";
import { memo } from "react";

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

type ExportModalHeaderProps = {
  title: string;
  description?: React.ReactNode;
};

/**
 * Renders a standardized header for export modals.
 */
export const ExportModalHeader = memo(({ title, description }: ExportModalHeaderProps) => (
  <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
    <DialogHeader>
      <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
        {title}
      </DialogTitle>
      {description && (
        <DialogDescription className="font-inter pt-2 text-center text-sm text-slate-500">
          {description}
        </DialogDescription>
      )}
    </DialogHeader>
  </motion.div>
));

ExportModalHeader.displayName = "ExportModalHeader";
