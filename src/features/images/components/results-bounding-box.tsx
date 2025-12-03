import React, { memo, useEffect, useRef, useState } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Detection, type ImageFile } from "@/features/images/hooks/use-results-image-viewer";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatConfidence, formatLabel, getColorForClass } from "@/lib/utils";

/**
 * Defines the props for the results bounding box component.
 */
interface ResultsBoundingBoxProps {
  /** The image file object, which includes the array of detections to be rendered. */
  imageFile: ImageFile;
  /** The natural, original dimensions of the image file. */
  imageDimensions: { width: number; height: number };
  /** The actual, on-screen dimensions and position of the displayed image. */
  renderedImageStyle: { width: number; height: number; top: number; left: number };
  /** The current zoom scale of the viewer. */
  transformScale: number;
}

/**
 * A memoized component that renders a scalable overlay of detection bounding boxes on an image.
 * It calculates the relative position and size of each box based on the original image dimensions
 * and applies them to the rendered image container, ensuring the boxes align correctly.
 */
export const ResultsBoundingBox = memo(
  ({ imageFile, imageDimensions, renderedImageStyle, transformScale }: ResultsBoundingBoxProps) => {
    const isMobile = useIsMobile();
    const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
    const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Clear timeout on unmount
    useEffect(() => {
      return () => {
        if (tooltipTimeoutRef.current) {
          clearTimeout(tooltipTimeoutRef.current);
        }
      };
    }, []);

    const handleBoxInteraction = (detectionId: string) => {
      if (isMobile) {
        if (tooltipTimeoutRef.current) {
          clearTimeout(tooltipTimeoutRef.current);
        }
        setSelectedDetectionId(detectionId);
        tooltipTimeoutRef.current = setTimeout(() => {
          setSelectedDetectionId(null);
        }, 3000);
      }
    };

    return (
      <div
        className="absolute"
        onClick={() => {
          if (isMobile && selectedDetectionId) {
            setSelectedDetectionId(null);
            if (tooltipTimeoutRef.current) {
              clearTimeout(tooltipTimeoutRef.current);
            }
          }
        }}
        style={{
          width: `${renderedImageStyle.width}px`,
          height: `${renderedImageStyle.height}px`,
          top: `${renderedImageStyle.top}px`,
          left: `${renderedImageStyle.left}px`,
        }}
      >
        {/* Maps over each detection to render an individual, positioned bounding box. */}
        {imageFile.detections?.map((det: Detection) => {
          // Keep tooltip open naturally on desktop, or programmatically open on mobile if selected
          const tooltipProps = isMobile && selectedDetectionId === det.id ? { open: true } : {};

          return (
            <Tooltip key={det.id} {...tooltipProps}>
              <TooltipTrigger asChild>
                <div
                  className="absolute box-border cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBoxInteraction(det.id);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    handleBoxInteraction(det.id);
                  }}
                  style={{
                    top: `${(det.yMin / imageDimensions.height) * 100}%`,
                    left: `${(det.xMin / imageDimensions.width) * 100}%`,
                    width: `${((det.xMax - det.xMin) / imageDimensions.width) * 100}%`,
                    height: `${((det.yMax - det.yMin) / imageDimensions.height) * 100}%`,
                    boxShadow: `inset 0 0 0 ${Math.max(0.05, 2 / (transformScale * 1.2))}px ${getColorForClass(det.label)}`,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {/* The content of the tooltip, displaying the formatted class label and optionally the confidence score. */}
                <p className="font-inter">
                  {det.status === "user_confirmed" ||
                  det.status === "user_edited_confirmed" ||
                  det.confidence === null
                    ? formatLabel(det.label)
                    : `${formatLabel(det.label)}: ${formatConfidence(det.confidence)}`}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }
);

ResultsBoundingBox.displayName = "ResultsBoundingBox";
