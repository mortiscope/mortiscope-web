import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { getRecentExports } from "@/features/export/actions/get-recent-exports";

/**
 * A custom hook that polls for the status of recent export jobs.
 *
 * It uses TanStack Query to fetch data periodically and shows toasts to 
 * the user when an export is completed or has failed. Once a job is handled,
 * it is marked as such to prevent duplicate notifications.
 */
export const useExportPoller = () => {
  const queryClient = useQueryClient();
  // Use a ref to keep track of handled jobs to prevent duplicate toasts.
  const handledExports = useRef<Set<string>>(new Set());

  // The 'data' object is automatically typed based on the return type of `get recent exports`.
  const { data } = useQuery({
    queryKey: ["recentExports"],
    queryFn: getRecentExports,
    // Poll every 5 seconds.
    refetchInterval: 5000,
    // Keep polling even if the browser window is not in focus.
    refetchIntervalInBackground: true,
    // Only run this query if the user is on the client-side.
    enabled: typeof window !== "undefined",
  });

  // Handle side-effects when the query data changes.
  useEffect(() => {
    // If there's no data yet, do nothing.
    if (!data) {
      return;
    }

    for (const exp of data) {
      // If we've already handled this job, skip it.
      if (handledExports.current.has(exp.id)) {
        continue;
      }

      // If the job is completed and has a URL, show a success toast and trigger download.
      if (exp.status === "completed" && exp.url) {
        toast.success("Export ready!", {
          description: "Your download will begin automatically.",
          action: {
            label: "Download",
            onClick: () => {
              window.location.href = exp.url!;
            },
          },
        });
        // Automatically trigger the download.
        window.location.href = exp.url;
        handledExports.current.add(exp.id);
      }
      // If the job failed, show an error toast.
      else if (exp.status === "failed") {
        toast.error("Export failed", {
          description: exp.failureReason || "An unknown error occurred.",
        });
        handledExports.current.add(exp.id);
      }
    }

    // Clean up the cache to remove handled "completed" or "failed" jobs.
    const activeExports = data.filter(
      (exp) => exp.status === "pending" || exp.status === "processing"
    );
    if (activeExports.length !== data.length) {
      queryClient.setQueryData(["recentExports"], activeExports);
    }
    // Run this effect whenever the data or query client changes.
  }, [data, queryClient]);
};
