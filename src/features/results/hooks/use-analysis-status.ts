import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { getAnalysisStatus } from "@/features/results/actions/get-analysis-status";
import { getCaseName } from "@/features/results/actions/get-case-name";

type UseAnalysisStatusProps = {
  caseId: string | null;
  // Allows the component to control when polling should start.
  isEnabled: boolean;
};

/**
 * A custom hook that polls for the status of a forensic analysis case.
 *
 * It uses TanStack Query's `useQuery` to repeatedly call the `getAnalysisStatus`
 * server action. Polling continues until the status is 'completed' or 'failed'.
 *
 * @param {UseAnalysisStatusProps} props The properties for the hook.
 * @returns The current status of the analysis from the server.
 */
export const useAnalysisStatus = ({ caseId, isEnabled }: UseAnalysisStatusProps) => {
  const router = useRouter();

  const {
    data: status,
    error,
    refetch,
  } = useQuery({
    // A unique query key for this specific case.
    queryKey: ["analysisStatus", caseId],
    // The function that will be called to fetch the data.
    queryFn: async () => {
      if (!caseId) return "not_found";
      return await getAnalysisStatus(caseId);
    },
    // The query will only run if both `caseId` and `isEnabled` are true.
    enabled: !!caseId && isEnabled,
    // Configure polling: refetch every 3 seconds.
    refetchInterval: 3000,
    // Don't refetch when the window is refocused, to avoid unnecessary calls.
    refetchOnWindowFocus: false,
  });

  // This effect runs whenever the 'status' data changes.
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Once the analysis is complete, redirect the user to the results page.
    if (status === "completed") {
      // Fetch case name and show toast
      const fetchCaseNameAndShowToast = async () => {
        let displayName = "Case";
        if (caseId) {
          try {
            const fetchedCaseName = await getCaseName(caseId);
            displayName = fetchedCaseName || "Case";
          } catch (error) {
            console.warn("Failed to fetch case name:", error);
          }
        }
        toast.success(`${displayName} analysis complete!`);
      };

      fetchCaseNameAndShowToast();

      // A small delay can make the UX feel smoother.
      timeoutId = setTimeout(() => {
        router.push(`/results/${caseId}`);
      }, 1000);
    }
    // If the analysis fails, inform the user. Polling will stop.
    else if (status === "failed") {
      toast.error("Analysis failed. Please contact support or try again.");
    }

    // Cleanup: Clear the timeout if status changes or component unmounts.
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [status, caseId, router]);

  // This effect runs if the query itself throws an error.
  useEffect(() => {
    if (error) {
      toast.error(`An error occurred while checking status: ${error.message}`);
    }
  }, [error]);

  return { status, refetch };
};
