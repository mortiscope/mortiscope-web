"use client";

import { motion, type Variants } from "framer-motion";
import { memo } from "react";
import { ImSpinner2 } from "react-icons/im";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for individual modal items.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the available button variants for the modal footer.
 */
type ButtonVariant = "destructive" | "warning" | "success";

/**
 * Defines the props for the annotation modal footer component.
 */
interface AnnotationModalFooterProps {
  /** Callback function when the cancel button is clicked. */
  onCancel?: () => void;
  /** Callback function when the confirm/action button is clicked. */
  onConfirm: () => void;
  /** Text for the cancel button. */
  cancelText?: string;
  /** Text for the confirm/action button. */
  confirmText?: string;
  /** Whether an action is currently pending. */
  isPending?: boolean;
  /** Text to show when action is pending. */
  pendingText?: string;
  /** The color variant for the confirm button. */
  buttonVariant?: ButtonVariant;
  /** Optional children to render between header and footer. */
  children?: React.ReactNode;
  /** Whether to show only a single button (no cancel button). */
  singleButton?: boolean;
}

/**
 * A reusable modal footer component for annotation modals.
 */
export const AnnotationModalFooter = memo(
  ({
    onCancel,
    onConfirm,
    cancelText = "Cancel",
    confirmText = "Confirm",
    isPending = false,
    pendingText,
    buttonVariant = "success",
    children,
    singleButton = false,
  }: AnnotationModalFooterProps) => {
    const buttonColorClasses: Record<ButtonVariant, string> = {
      destructive: "bg-rose-600 hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20",
      warning: "bg-amber-500 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-400/20",
      success: "bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20",
    };

    return (
      <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
        {children}
        <DialogFooter className={cn("flex w-full", singleButton ? "" : "flex-row gap-3")}>
          {!singleButton && onCancel && (
            <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
              <Button
                variant="outline"
                onClick={onCancel}
                disabled={isPending}
                className="font-inter h-10 w-full cursor-pointer uppercase transition-all duration-300 ease-in-out hover:bg-slate-100"
              >
                {cancelText}
              </Button>
            </div>
          )}

          <div
            className={cn(singleButton ? "w-full" : "flex-1", isPending && "cursor-not-allowed")}
          >
            <Button
              onClick={onConfirm}
              disabled={isPending}
              className={cn(
                "font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 uppercase transition-all duration-300 ease-in-out",
                buttonColorClasses[buttonVariant]
              )}
            >
              {isPending ? (
                <>
                  <ImSpinner2 className="h-5 w-5 animate-spin" />
                  {pendingText || confirmText}
                </>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </DialogFooter>
      </motion.div>
    );
  }
);

AnnotationModalFooter.displayName = "AnnotationModalFooter";
