import { motion, type Variants } from "framer-motion";
import { memo } from "react";

/**
 * Framer Motion variants for individual items.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 150,
    },
  },
};

interface AccountTabHeaderProps {
  title: string;
  description: string;
}

/**
 * Renders the header section for account tabs.
 */
export const AccountTabHeader = memo<AccountTabHeaderProps>(({ title, description }) => (
  <motion.div variants={itemVariants} className="text-center lg:text-left">
    <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
      {title}
    </h1>
    <p className="font-inter mt-2 text-sm text-slate-600">{description}</p>
  </motion.div>
));

AccountTabHeader.displayName = "AccountTabHeader";
