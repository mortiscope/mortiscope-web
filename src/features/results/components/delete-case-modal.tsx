"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ImSpinner2 } from "react-icons/im";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteCase } from "@/features/results/actions/delete-case";
import { type getCases } from "@/features/results/actions/get-cases";
import { cn } from "@/lib/utils";

type Case = Awaited<ReturnType<typeof getCases>>[number];

/**
 * Framer Motion variants for the main modal content container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.2,
    },
  },
};

/**
 * Framer Motion variants for individual animated items within the modal.
 */
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 150,
    },
  },
};

/**
 * Defines the props for the DeleteCaseModal component.
 */
interface DeleteCaseModalProps {
  /** The unique identifier of the case to be deleted. */
  caseId: string | null;
  /** The name of the case, displayed for confirmation. */
  caseName: string | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to confirm the deletion of a case, styled for consistency with other modals.
 * It handles the mutation and provides feedback to the user.
 *
 * @param {DeleteCaseModalProps} props The props for controlling the modal's state.
 */
export const DeleteCaseModal = ({
  caseId,
  caseName,
  isOpen,
  onOpenChange,
}: DeleteCaseModalProps) => {
  const queryClient = useQueryClient();

  // Mutation with optimistic update logic.
  const { mutate, isPending } = useMutation({
    // The mutation function that will be called.
    mutationFn: deleteCase,
    onMutate: async (variables) => {
      // Immediately close the modal for a snappy UX.
      onOpenChange(false);

      // Cancel any outgoing refetches to prevent overwriting our optimistic update.
      await queryClient.cancelQueries({ queryKey: ["cases"] });

      // Snapshot the previous value.
      const previousCases = queryClient.getQueryData<Case[]>(["cases"]);

      // Optimistically remove the case from the cache.
      queryClient.setQueryData<Case[]>(["cases"], (oldCases = []) =>
        oldCases.filter((c) => c.id !== variables.caseId)
      );

      // Return a context object with the snapshotted value.
      return { previousCases };
    },
    onSuccess: (data) => {
      // If the server action returned a success message, show it.
      if (data.success) {
        toast.success(data.success);
      }
    },
    onError: (error, variables, context) => {
      // If the mutation fails, roll back to the previous state.
      if (context?.previousCases) {
        queryClient.setQueryData(["cases"], context.previousCases);
      }
      // Inform the user of the failure.
      toast.error("Deletion failed. The case has been restored.");
    },
    onSettled: () => {
      // Always refetch after the mutation is settled to ensure data consistency.
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });

  /**
   * Handles the click event for the delete confirmation button.
   */
  const handleDelete = () => {
    if (caseId) {
      mutate({ caseId });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-sm md:rounded-3xl">
        {/* Main animation wrapper for the modal content. */}
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Animated wrapper for the dialog header. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
            <DialogHeader className="text-center">
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-rose-600 md:text-2xl">
                Delete Case
              </DialogTitle>
              <DialogDescription className="font-inter pt-4 text-center text-sm text-slate-600">
                You are about to permanently delete the case folder named&nbsp;
                <strong className="font-semibold text-slate-800">{`${caseName}`}</strong>. Keep in
                mind that this action is irreversible.
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* Animated wrapper for the dialog footer. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
            <DialogFooter className="flex w-full flex-row gap-3">
              <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                  className="font-inter h-10 w-full cursor-pointer uppercase transition-all duration-300 ease-in-out hover:bg-slate-100"
                >
                  Cancel
                </Button>
              </div>

              <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 uppercase transition-all duration-300 ease-in-out hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20"
                >
                  {isPending ? (
                    <>
                      <ImSpinner2 className="h-5 w-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
