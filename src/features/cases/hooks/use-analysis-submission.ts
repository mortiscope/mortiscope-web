import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cancelAnalysis } from "@/features/analyze/actions/cancel-analysis";
import { submitAnalysis } from "@/features/analyze/actions/submit-analysis";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

/**
 * Defines the props required by the useAnalysisSubmission hook.
 */
interface UseAnalysisSubmissionProps {
  /** The unique identifier of the case to be submitted or canceled. */
  caseId: string | null;
}

/**
 * A custom hook that encapsulates the server mutations for submitting and canceling an analysis.
 * It leverages Tanstack Query for asynchronous state management and integrates with the global
 * `useAnalyzeStore` to update the application's state upon success.
 *
 * @param {UseAnalysisSubmissionProps} props The props for the hook.
 * @returns An object containing the submission/cancellation functions and their pending states.
 */
export const useAnalysisSubmission = ({ caseId }: UseAnalysisSubmissionProps) => {
  // Initializes the Tanstack Query client for cache invalidation.
  const queryClient = useQueryClient();
  // Retrieves state update functions from the global `useAnalyzeStore`.
  const startProcessing = useAnalyzeStore((state) => state.startProcessing);
  const cancelProcessing = useAnalyzeStore((state) => state.cancelProcessing);

  /**
   * Initializes a mutation for submitting the analysis to the server.
   * It handles success and error states, providing user feedback and updating global state.
   */
  const { mutate: submitAnalysisMutation, isPending: isSubmitting } = useMutation({
    mutationFn: submitAnalysis,
    onSuccess: (data) => {
      // On successful submission:
      if (data.success) {
        // Invalidate the 'cases' query to refetch the main case list in the background.
        void queryClient.invalidateQueries({ queryKey: ["cases"] });
        // Update the global Zustand store to put the UI into "processing" mode.
        startProcessing();
      } else {
        // Handle server-side errors returned in the success payload.
        toast.error(data.error || "Failed to submit analysis. Please try again.");
      }
    },
    onError: (error) => {
      // Handle unexpected network or server errors.
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Submission error:", error);
    },
  });

  /**
   * Initializes a mutation for canceling a submitted analysis.
   */
  const { mutate: cancelAnalysisMutation, isPending: isCancelling } = useMutation({
    mutationFn: cancelAnalysis,
    onSuccess: (data) => {
      // On success, display the server's message and reset the global state.
      if (data.status === "success") {
        toast.success(data.message);
        cancelProcessing();
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      // Handle unexpected network or server errors during cancellation.
      toast.error("An unexpected error occurred while cancelling. Please try again.");
      console.error("Cancellation error:", error);
    },
  });

  /**
   * A safe wrapper function to trigger the submission mutation.
   * It ensures a `caseId` exists before proceeding.
   */
  const submit = () => {
    if (!caseId) {
      toast.error("An error occurred. Could not find case ID to proceed.");
      return;
    }
    submitAnalysisMutation({ caseId });
  };

  /**
   * A safe wrapper function to trigger the cancellation mutation.
   * It requires a `caseId` to proceed.
   */
  const cancel = () => {
    if (!caseId) {
      toast.error("Cannot cancel: Case ID is missing.");
      return;
    }
    cancelAnalysisMutation({ caseId });
  };

  // Exposes the public API of the hook for the consuming component.
  return {
    submit,
    cancel,
    isSubmitting,
    isCancelling,
  };
};
