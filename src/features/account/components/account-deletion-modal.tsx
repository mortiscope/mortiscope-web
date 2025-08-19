"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion, type Variants } from "framer-motion";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { requestAccountDeletion } from "@/features/account/actions/request-account-deletion";
import { AccountModalFooter } from "@/features/account/components/account-modal-footer";
import { AccountModalHeader } from "@/features/account/components/account-modal-header";
import {
  type AccountDeletionModalFormValues,
  AccountDeletionModalSchema,
} from "@/features/account/schemas/account";
import { uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const modalContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Framer Motion variants for individual items in the modal.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring" as const, damping: 20, stiffness: 150 } },
};

/**
 * Defines the props for the `AccountDeletionModal` component.
 */
interface AccountDeletionModalProps {
  /** A boolean to control the visibility of the modal. */
  isOpen: boolean;
  /** A callback function to handle changes to the modal's open state. */
  onOpenChange: (isOpen: boolean) => void;
  /** The verified password from the parent component. */
  verifiedPassword?: string;
}

/**
 * A modal component for account deletion confirmation.
 */
export const AccountDeletionModal = ({
  isOpen,
  onOpenChange,
  verifiedPassword,
}: AccountDeletionModalProps) => {
  const [isDeletionPending, setIsDeletionPending] = useState(false);

  // Form setup with validation
  const form = useForm<AccountDeletionModalFormValues>({
    resolver: zodResolver(AccountDeletionModalSchema),
    defaultValues: {
      confirmationText: "",
    },
    mode: "onChange",
  });

  /**
   * A wrapper for `onOpenChange` that ensures the confirmation text is reset when the modal is closed.
   */
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setIsDeletionPending(false);
    }
    onOpenChange(open);
  };

  /**
   * Button state logic
   */
  const confirmationText = form.watch("confirmationText");
  const isTextValid = confirmationText === "Delete this account";
  const isDeleteEnabled = isTextValid && !isDeletionPending;

  /**
   * Handler for the delete button click.
   */
  const handleDelete = async () => {
    if (!isDeleteEnabled || !verifiedPassword) return;

    setIsDeletionPending(true);

    try {
      const result = await requestAccountDeletion({
        password: verifiedPassword,
      });

      if (result.success) {
        toast.success("Account deletion initiated successfully.", {
          className: "font-inter",
        });

        // Close modal
        handleOpenChange(false);

        // Show logout warning toast
        toast.warning("You will be logged out shortly.", {
          className: "font-inter",
        });

        // Logout user after a brief delay
        setTimeout(async () => {
          await signOut({ callbackUrl: "/signin" });
        }, 2000);
      } else {
        toast.error(result.error || "Failed to initiate account deletion.", {
          className: "font-inter",
        });
      }
    } catch {
      toast.error("An unexpected error occurred.", {
        className: "font-inter",
      });
    } finally {
      setIsDeletionPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        {/* The main animated container for the modal's content. */}
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header */}
          <AccountModalHeader
            title="Delete Account"
            description={
              <>
                This action will{" "}
                <strong className="font-medium text-slate-800">permanently delete</strong> your
                account and all associated data. You will have a{" "}
                <strong className="font-medium text-slate-800">30-day grace period</strong> to
                recover your account if you change your mind.
              </>
            }
            variant="rose"
          />

          {/* Instruction text */}
          <motion.div variants={itemVariants} className="px-6">
            <p className="font-inter text-left text-sm text-slate-600">
              Enter the <strong className="font-medium text-slate-800">exact text</strong> in the
              field below to confirm.
            </p>
          </motion.div>

          {/* Input Field */}
          <motion.div variants={itemVariants} className="px-6 py-0">
            <Form {...form}>
              <FormField
                control={form.control}
                name="confirmationText"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Input
                        placeholder="Delete this account"
                        className={cn(
                          uniformInputStyles,
                          "w-full focus-visible:!border-rose-600 data-[state=open]:!border-rose-600",
                          form.formState.errors.confirmationText &&
                            "border-red-500 focus-visible:!border-red-500"
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-inter text-xs" />
                  </FormItem>
                )}
              />
            </Form>
          </motion.div>

          {/* Footer */}
          <AccountModalFooter
            isPending={isDeletionPending}
            onCancel={() => handleOpenChange(false)}
            onAction={handleDelete}
            actionButtonText="Delete Account"
            pendingButtonText="Deleting..."
            disabled={!isDeleteEnabled}
            variant="rose"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

AccountDeletionModal.displayName = "AccountDeletionModal";
