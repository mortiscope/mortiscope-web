"use client";

import { motion } from "framer-motion";
import React, { memo } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
import { DETECTION_CLASS_COLORS, DETECTION_CLASS_ORDER } from "@/lib/constants";
import { cn, formatConfidence, formatLabel } from "@/lib/utils";

/**
 * A utility function to lighten a given hex color. This is used to generate
 * the border color for the selected radio button item.
 *
 * @param hex The base hex color string.
 * @param classLabel The class label, used for a special case.
 * @returns A lightened hex color string.
 */
const getLightenedColor = (hex: string): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const factor = 1.25;
  const r = Math.min(255, Math.floor((num >> 16) * factor));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00ff) * factor));
  const b = Math.min(255, Math.floor((num & 0x0000ff) * factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

/**
 * Defines the props for the editor detection panel component.
 */
type EditorDetectionPanelProps = {
  /** A boolean to apply the mobile layout instead of the desktop layout. */
  isMobile?: boolean;
  /** A boolean indicating if another details panel is currently open, used for positioning the desktop card. */
  hasOpenPanel?: boolean;
};

/**
 * The core smart content of the detection panel. It subscribes to the Zustand store,
 * displays details of the selected detection, and provides controls to modify its state.
 */
const DetectionPanelContent = memo(() => {
  // Retrieves state and actions from the global `useAnnotationStore`.
  const selectedDetectionId = useAnnotationStore((state) => state.selectedDetectionId);
  const detections = useAnnotationStore((state) => state.detections);
  const updateDetection = useAnnotationStore((state) => state.updateDetection);
  const removeDetection = useAnnotationStore((state) => state.removeDetection);

  // Finds the full object for the currently selected detection.
  const currentDetection = detections.find((det) => det.id === selectedDetectionId);

  // A local state to hold a snapshot of the detection being displayed.
  const [displayedDetection, setDisplayedDetection] = React.useState(currentDetection);

  /** A side effect to update the local `displayedDetection` when the global selection changes. */
  React.useEffect(() => {
    if (currentDetection) {
      setDisplayedDetection(currentDetection);
    }
  }, [currentDetection]);

  // If there's no detection to display, render nothing.
  if (!displayedDetection) return null;

  const selectedDetection = displayedDetection;

  /** Handles changes to the class label via the radio group. */
  const handleLabelChange = (newLabel: string) => {
    if (selectedDetectionId) {
      updateDetection(selectedDetectionId, { label: newLabel });
    }
  };

  /** Sets the detection's status to `user_confirmed`. */
  const handleVerify = () => {
    if (selectedDetectionId) {
      updateDetection(selectedDetectionId, { status: "user_confirmed" });
    }
  };

  /** Removes the currently selected detection from the store. */
  const handleDelete = () => {
    if (selectedDetectionId) {
      removeDetection(selectedDetectionId);
    }
  };

  const isVerified = selectedDetection.status === "user_confirmed";

  return (
    <div className="space-y-3">
      {/* Read-only information about the detection. */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-inter text-sm font-medium text-emerald-100">Confidence</span>
          <span className="font-inter text-sm text-white">
            {formatConfidence(selectedDetection.confidence)}
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
      <div className="space-y-2">
        <RadioGroup
          value={selectedDetection.label}
          onValueChange={handleLabelChange}
          className="gap-1.5 space-y-1.5"
        >
          {DETECTION_CLASS_ORDER.map((classLabel) => {
            const isSelected = selectedDetection.label === classLabel;
            const selectedColor = isSelected
              ? getLightenedColor(
                  DETECTION_CLASS_COLORS[classLabel] || DETECTION_CLASS_COLORS.default
                )
              : null;

            return (
              <Label
                key={classLabel}
                htmlFor={classLabel}
                className="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-2.5 transition-all duration-200"
                style={{
                  borderColor: selectedColor || "rgba(167, 243, 208, 0.4)",
                  backgroundColor: isSelected ? "rgba(5, 150, 105)" : "rgba(16, 185, 129, 0.15)",
                }}
              >
                <RadioGroupItem
                  value={classLabel}
                  id={classLabel}
                  className="focus-visible:ring-offset-0 [&_svg]:fill-current"
                  style={{
                    borderColor: selectedColor || "rgba(167, 243, 208, 0.6)",
                    color: selectedColor || "#ffffff",
                  }}
                />
                <span className="font-inter text-sm font-normal text-white">
                  {formatLabel(classLabel)}
                </span>
              </Label>
            );
          })}
        </RadioGroup>
      </div>

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

/**
 * A responsive smart component that displays details and controls for the currently selected detection.
 * It renders as a slide-up `Sheet` on mobile and a floating `Card` on desktop. Its visibility is
 * controlled by the `selectedDetectionId` from the global annotation store.
 */
export const EditorDetectionPanel = memo(
  ({ isMobile = false, hasOpenPanel = false }: EditorDetectionPanelProps) => {
    // Subscribes to the global store to get the selected detection ID and the clear action.
    const selectedDetectionId = useAnnotationStore((state) => state.selectedDetectionId);
    const clearSelection = useAnnotationStore((state) => state.clearSelection);

    // Renders a bottom drawer when on a mobile device.
    if (isMobile) {
      return (
        <Sheet
          open={!!selectedDetectionId}
          onOpenChange={(open) => {
            // When the sheet is closed, clear the selection in the global store.
            if (!open) clearSelection();
          }}
        >
          <SheetContent
            side="bottom"
            className="h-auto max-h-[85vh] border-0 bg-emerald-700 pb-6 [&>button]:cursor-pointer [&>button]:text-white [&>button]:hover:text-emerald-200 [&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button]:focus:outline-none"
          >
            <SheetHeader className="border-b-0 pb-3">
              <SheetTitle className="font-plus-jakarta-sans text-center text-lg font-medium text-white">
                Detection Details
              </SheetTitle>
              <SheetDescription className="sr-only">
                Edit detection class, verify, or delete the selected detection
              </SheetDescription>
            </SheetHeader>
            <div className="px-6">
              <DetectionPanelContent />
            </div>
          </SheetContent>
        </Sheet>
      );
    }

    // Determines the horizontal position of the floating card.
    const xPosition = hasOpenPanel ? 256 : 0;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, x: xPosition }}
        animate={{
          opacity: 1,
          scale: 1,
          x: xPosition,
        }}
        exit={{ opacity: 0, scale: 0.95, x: xPosition }}
        transition={{
          opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
          scale: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
          x: { duration: 0.3, ease: "easeInOut" },
        }}
        className="fixed top-[5rem] left-[5rem] z-10 md:top-[6rem] md:left-[7rem]"
      >
        <Card
          className="w-72 rounded-lg border-0 bg-emerald-700/90 shadow-lg backdrop-blur-md"
          style={{
            boxShadow:
              "0 25px 50px -12px rgba(148, 163, 184, 0.15), 0 12px 24px -8px rgba(148, 163, 184, 0.1)",
            borderRadius: "1.5rem",
          }}
        >
          <CardHeader className="border-b-0">
            <CardTitle className="font-plus-jakarta-sans text-center text-lg text-white">
              Detection Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DetectionPanelContent />
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

EditorDetectionPanel.displayName = "EditorDetectionPanel";
