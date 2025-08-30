import { memo } from "react";

import { Button } from "@/components/ui/button";
import { DetectionPanelSelector } from "@/features/annotation/components/detection-panel-selector";
import { useDetectionPanel } from "@/features/annotation/hooks/use-detection-panel";
import { cn, formatConfidence } from "@/lib/utils";

/**
 * The core smart content of the detection panel. It subscribes to the Zustand store,
 * displays details of the selected detection, and provides controls to modify its state.
 */
export const DetectionPanelContent = memo(function DetectionPanelContent() {
  // Use the detection panel hook to manage state and behavior
  const { displayedDetection, handleLabelChange, handleVerify, handleDelete } = useDetectionPanel();

  // If there's no detection to display, render nothing.
  if (!displayedDetection) return null;

  const selectedDetection = displayedDetection;
  const isVerified = selectedDetection.status === "user_confirmed";

  return (
    <div className="space-y-3">
      {/* Read-only information about the detection. */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-inter text-sm font-medium text-emerald-100">Confidence</span>
          <span className="font-inter text-sm text-white">
            {isVerified || selectedDetection.confidence === null
              ? "Reviewed"
              : formatConfidence(selectedDetection.confidence)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-inter text-sm font-medium text-emerald-100">Status</span>
          <span
            className={cn(
              "font-inter text-sm font-medium",
              isVerified ? "text-teal-200" : "text-amber-200"
            )}
          >
            {isVerified ? "Verified" : "Unverified"}
          </span>
        </div>
      </div>

      {/* The radio group for changing the detection's class label. */}
      <DetectionPanelSelector
        selectedLabel={selectedDetection.label}
        onLabelChange={handleLabelChange}
      />

      {/* Action buttons for the selected detection. */}
      <div className="grid grid-cols-2 gap-3">
        {/* The verify button is only shown for unverified detections. */}
        {!isVerified && (
          <Button
            onClick={handleVerify}
            variant="outline"
            className="font-inter h-10 cursor-pointer rounded-lg border-2 border-white bg-transparent font-normal text-white shadow-none transition-all duration-300 ease-in-out hover:border-emerald-400 hover:bg-emerald-400 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2"
          >
            Verify
          </Button>
        )}
        <Button
          onClick={handleDelete}
          variant="outline"
          className={cn(
            "font-inter h-10 cursor-pointer rounded-lg border-2 border-white bg-transparent font-normal text-white shadow-none transition-all duration-300 ease-in-out hover:border-rose-400 hover:bg-rose-400 hover:text-white focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2",
            // The delete button spans both columns if the verify button is not present.
            isVerified && "col-span-2"
          )}
        >
          Delete
        </Button>
      </div>
    </div>
  );
});

DetectionPanelContent.displayName = "DetectionPanelContent";
