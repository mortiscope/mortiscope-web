import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { getExportStatus } from "@/features/export/actions/get-export-status";

type UseExportStatusProps = {
  exportId: string | null;
  onClose: () => void;
};

/**
 * A hook that polls for the status of a single export job.
 * It handles success and failure notifications and triggers the download.
 */
export const useExportStatus = ({ exportId, onClose }: UseExportStatusProps) => {
  const { data: exportStatusData } = useQuery({
    queryKey: ["exportStatus", exportId],
    queryFn: () => getExportStatus({ exportId: exportId! }),
    enabled: !!exportId,
    refetchInterval: 3000,
    retry: false,
  });

  useEffect(() => {
    if (exportStatusData?.status === "completed" && exportStatusData.url) {
      toast.success("Export ready! Download will begin.");
      window.location.href = exportStatusData.url;
      onClose();
    } else if (exportStatusData?.status === "failed") {
      toast.error("Export failed during processing.", {
        description: exportStatusData.failureReason,
      });
      onClose();
    }
  }, [exportStatusData, onClose]);

  // Return a clear boolean indicating if an export is in progress.
  return !!exportId;
};
