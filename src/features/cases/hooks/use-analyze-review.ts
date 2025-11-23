import { format } from "date-fns";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useAnalysisSubmission } from "@/features/cases/hooks/use-analysis-submission";
import { useSelectionNavigator } from "@/features/cases/hooks/use-selection-navigator";
import { caseDetailsSchema } from "@/features/cases/schemas/case-details";
import { type AnalysisStatus } from "@/features/results/actions/get-analysis-status";
import { useAnalysisStatus } from "@/features/results/hooks/use-analysis-status";

/**
 * A mapping of analysis status types to user-friendly messages displayed during processing.
 */
const processingMessages: Record<AnalysisStatus, string> = {
  pending: "Waiting for image uploads to complete...",
  processing: "Running analysis on the backend...",
  completed: "Finalizing results...",
  failed: "An error occurred during analysis.",
  not_found: "Initializing analysis...",
};

/**
 * An orchestrator hook that composes multiple specialized hooks to manage the state and logic
 * for the `AnalyzeReview` component. It handles data display, submission, cancellation,
 * and real-time status polling of the analysis process.
 *
 * @returns A unified API of state and handlers required by the review component.
 */
export const useAnalyzeReview = () => {
  const [isPending, startTransition] = useTransition();
  // Retrieves core data, status, and navigation actions from the global `useAnalyzeStore`.
  const { details, data, caseId, status: wizardStatus, prevStep } = useAnalyzeStore();
  const files = data.files;
  // A derived boolean indicating if the wizard is in the final, locked "processing" state.
  const isProcessing = wizardStatus === "processing";

  /** Manages the server actions for submitting and canceling the analysis. */
  const { submit, cancel, isSubmitting, isCancelling } = useAnalysisSubmission({ caseId });
  /** Memoizes the list of files, sorted by upload date for consistent display. */
  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => b.dateUploaded.getTime() - a.dateUploaded.getTime()),
    [files]
  );
  /** Controls the state and navigation logic for the image preview modal. */
  const modalController = useSelectionNavigator({ items: sortedFiles });
  /** Polls the backend for the analysis status, but only when `isProcessing` is true. */
  const { status: analysisStatus } = useAnalysisStatus({ caseId, isEnabled: isProcessing });

  // State to store local blob URLs for newly uploaded files, enabling instant previews.
  const [objectUrls, setObjectUrls] = useState<Map<string, string>>(new Map());

  /**
   * Creates and manages temporary local object URLs for previewing newly added files.
   * The cleanup function is crucial to revoke these URLs and prevent memory leaks.
   */
  useEffect(() => {
    const newObjectUrls = new Map<string, string>();
    files.forEach((file) => {
      if (file.file && !file.url) {
        newObjectUrls.set(file.id, URL.createObjectURL(file.file));
      }
    });
    setObjectUrls(newObjectUrls);
    // Revoke all created object URLs when the component unmounts or `files` changes.
    return () => newObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  /**
   * Handles the final submission of the analysis case. It performs validation checks
   * on the form data and file uploads before triggering the submission action.
   * The action is wrapped in `startTransition` to manage pending UI states.
   */
  const handleSubmit = () => {
    startTransition(() => {
      if (isProcessing || isSubmitting) return;
      // Validate form details against the Zod schema.
      const validation = caseDetailsSchema.safeParse(details);
      if (!validation.success) {
        toast.error("Form data is invalid. Please go back and check the details.");
        return;
      }
      // Ensure all files have been successfully uploaded before submission.
      if (files.length === 0 || files.some((f) => f.status !== "success")) {
        toast.error("Please ensure all images have been successfully uploaded.");
        return;
      }
      submit();
    });
  };

  /**
   * Determines the correct URL for an image preview, prioritizing a remote URL over a temporary local object URL.
   */
  const getPreviewUrl = (file: UploadableFile) => {
    if (file.url) return file.url;
    return objectUrls.get(file.id) || "";
  };

  /**
   * Memoizes the formatted data for display in the interface.
   */
  const displayData = useMemo(() => {
    const finalTemperatureValue = details.temperature?.value ?? 0;
    return {
      caseName: details.caseName,
      temperatureDisplay: `${finalTemperatureValue.toFixed(1)} °${details.temperature?.unit || "C"}`,
      caseDateDisplay: details.caseDate ? format(details.caseDate, "MMMM d, yyyy") : "N/A",
      locationDisplay: [
        details.location?.barangay?.name,
        details.location?.city?.name,
        details.location?.province?.name,
        details.location?.region?.name,
      ]
        .filter(Boolean)
        .join(", "),
    };
  }, [details]);

  // Exposes a clean, unified API for the analyze review component to consume.
  return {
    isProcessing,
    isCancelling,
    isSubmitting,
    isPending,
    processingMessage: processingMessages[analysisStatus ?? "not_found"],
    displayData,
    sortedFiles,
    modalController,
    handleSubmit,
    handleCancel: cancel,
    prevStep,
    getPreviewUrl,
  };
};
