"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { PiWarning } from "react-icons/pi";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { AccountModalFooter } from "@/features/account/components/account-modal-footer";
import { AccountModalHeader } from "@/features/account/components/account-modal-header";
import { AccountPasswordInput } from "@/features/account/components/account-password-input";
import { deleteSelectedCases } from "@/features/dashboard/actions/delete-selected-cases";
import {
  type DeleteSelectedCasesFormValues,
  DeleteSelectedCasesSchema,
} from "@/features/dashboard/schemas/dashboard";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.1 } },
};

/**
 * Framer Motion variants for individual items.
 */
const itemVariants = {
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

/**
 * Props for the delete selected case modal component.
 */
interface DeleteSelectedCaseModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to handle modal open state changes */
  onOpenChange: (isOpen: boolean) => void;
  /** Array of selected case objects with id and name */
  selectedCases: Array<{ id: string; name: string }>;
  /** Callback when cases are successfully deleted */
  onSuccess: () => void;
}

/**
 * A modal component for deleting multiple selected cases.
 * Requires password verification before deletion.
 */
export const DeleteSelectedCaseModal = ({
  isOpen,
  onOpenChange,
  selectedCases,
  onSuccess,
}: DeleteSelectedCaseModalProps) => {
  const queryClient = useQueryClient();

  // Memoize the case IDs array
  const caseIds = useMemo(() => selectedCases.map((c) => c.id), [selectedCases]);

  // Memoize the case count
  const caseCount = useMemo(() => selectedCases.length, [selectedCases.length]);

  // Mutation for deleting cases
  const deleteMutation = useMutation({
    mutationFn: deleteSelectedCases,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.success, {
          className: "font-inter",
        });
        // Invalidate queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ["dashboard-cases"] });
        onSuccess();
        handleClose();
      } else if (result.error) {
        // Handle password error specifically
        if (result.error.includes("password")) {
          form.setError("currentPassword", {
            type: "manual",
            message: "Invalid password.",
          });
        } else {
          toast.error(result.error, {
            className: "font-inter",
          });
        }
      }
    },
    onError: () => {
      toast.error("An unexpected error occurred.", {
        className: "font-inter",
      });
    },
  });

  // Initialize form with validation
  const form = useForm<DeleteSelectedCasesFormValues>({
    resolver: zodResolver(DeleteSelectedCasesSchema),
    defaultValues: {
      currentPassword: "",
      caseIds: caseIds,
    },
    mode: "onChange",
  });

  // Update caseIds when selectedCases changes
  useMemo(() => {
    form.setValue("caseIds", caseIds);
  }, [caseIds, form]);

  /** Check if form is valid */
  const isFormValid = useMemo(
    () => form.formState.isValid && !form.formState.errors.currentPassword,
    [form.formState.isValid, form.formState.errors.currentPassword]
  );

  /**
   * Form submission handler
   */
  const onSubmit = (data: DeleteSelectedCasesFormValues) => {
    if (!isFormValid) return;
    deleteMutation.mutate(data);
  };

  /**
   * Close handler that resets form state
   */
  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  /** Check if delete button should be enabled */
  const isDeleteEnabled = useMemo(
    () => isFormValid && !deleteMutation.isPending,
    [isFormValid, deleteMutation.isPending]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[85vh] flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
            <motion.div
              className="contents"
              variants={modalContentVariants}
              initial="hidden"
              animate="show"
            >
              {/* Header Section */}
              <motion.div variants={itemVariants} className="shrink-0">
                <AccountModalHeader
                  title="Delete Selected Cases"
                  description={`You are about to permanently delete ${caseCount} ${caseCount === 1 ? "case" : "cases"}.`}
                  variant="rose"
                />
              </motion.div>

              {/* Scrollable Content Section */}
              <motion.div
                variants={itemVariants}
                className="flex-1 space-y-4 overflow-y-auto border-y border-slate-200 px-6 py-4"
              >
                {/* Warning Message Section */}
                <div className="flex items-start gap-3 rounded-2xl border-2 border-rose-400 bg-rose-50 p-4">
                  <PiWarning className="h-5 w-5 flex-shrink-0 text-rose-500" />
                  <p className="font-inter flex-1 text-sm text-rose-700">
                    <strong className="font-semibold text-rose-600">Warning:</strong> This action is
                    irreversible. All data associated with the selected cases will be permanently
                    deleted and cannot be recovered.
                  </p>
                </div>

                {/* Cases List Section */}
                <div>
                  <p className="font-inter mb-2 text-sm text-slate-700">
                    The following {caseCount === 1 ? "case" : "cases"} will be deleted:
                  </p>
                  <ul className="max-h-32 space-y-1.5 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50 p-3">
                    {selectedCases.map((caseItem) => (
                      <li
                        key={caseItem.id}
                        className="font-inter flex items-start gap-2 text-sm text-rose-700"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500" />
                        <span className="flex-1">{caseItem.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Password Input Section */}
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <label className="font-inter text-sm text-slate-700">
                        Enter password to confirm
                      </label>
                      <FormControl>
                        <AccountPasswordInput
                          {...field}
                          disabled={deleteMutation.isPending}
                          focusColor="rose"
                          hasError={!!form.formState.errors.currentPassword}
                        />
                      </FormControl>
                      <FormMessage className="font-inter text-xs" />
                    </FormItem>
                  )}
                />
              </motion.div>

              {/* Footer/Actions Section */}
              <motion.div variants={itemVariants} className="shrink-0">
                <AccountModalFooter
                  isPending={deleteMutation.isPending}
                  onCancel={handleClose}
                  onAction={form.handleSubmit(onSubmit)}
                  actionButtonText="Delete"
                  pendingButtonText="Deleting..."
                  disabled={!isDeleteEnabled}
                  variant="rose"
                />
              </motion.div>
            </motion.div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

DeleteSelectedCaseModal.displayName = "DeleteSelectedCaseModal";
