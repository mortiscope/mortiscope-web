"use client";

import { motion } from "framer-motion";
import { memo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DetectionPanelContent } from "@/features/annotation/components/detection-panel-content";
import { useDetectionPanel } from "@/features/annotation/hooks/use-detection-panel";

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
 * A responsive smart container component that displays details and controls for the currently selected detection.
 * It renders as a slide-up `Sheet` on mobile and a floating `Card` on desktop. Its visibility is
 * controlled by the `selectedDetectionId` from the global annotation store.
 */
export const EditorDetectionPanel = memo(
  ({ isMobile = false, hasOpenPanel = false }: EditorDetectionPanelProps) => {
    // Use the detection panel hook to get state and handlers
    const { selectedDetectionId, handleClose } = useDetectionPanel();

    // Renders a bottom drawer when on a mobile device.
    if (isMobile) {
      return (
        <Sheet
          open={!!selectedDetectionId}
          onOpenChange={(open) => {
            // When the sheet is closed, clear the selection and switch to pan mode.
            if (!open) {
              handleClose();
            }
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
