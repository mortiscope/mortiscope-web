import React, { memo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Detection, type EditorImage } from "@/features/annotation/hooks/use-editor-image";
import { formatConfidence, formatLabel, getColorForClass } from "@/lib/utils";

/**
 * Defines the props for the editor bounding box component.
 */
interface EditorBoundingBoxProps {
  /** The image object, which includes the array of detections to be rendered. */
  image: EditorImage;
  /** The natural, original dimensions of the image file. */
  imageDimensions: { width: number; height: number };
  /** The actual, on-screen dimensions and position of the displayed image. */
  renderedImageStyle: { width: number; height: number; top: number; left: number };
}

/**
 * A memoized component that renders bounding boxes for detections in the annotation editor.
 * Currently displays boxes in read-only mode with tooltips. Designed to be extended with
 * interactive features like resizing, dragging, and editing in the future.
 */
export const EditorBoundingBox = memo(
  ({ image, imageDimensions, renderedImageStyle }: EditorBoundingBoxProps) => {
    // Calculate dynamic border width based on rendered image size for consistent visual thickness
    const borderWidth = Math.max(2, renderedImageStyle.width * 0.0025);

    return (
      <div
        className="absolute"
        style={{
          width: `${renderedImageStyle.width}px`,
          height: `${renderedImageStyle.height}px`,
          top: `${renderedImageStyle.top}px`,
          left: `${renderedImageStyle.left}px`,
        }}
      >
        {/* Maps over each detection to render an individual, positioned bounding box. */}
        {image.detections?.map((det: Detection) => (
          <Tooltip key={det.id}>
            <TooltipTrigger asChild>
              <div
                className="absolute box-border cursor-pointer"
                style={{
                  top: `${(det.yMin / imageDimensions.height) * 100}%`,
                  left: `${(det.xMin / imageDimensions.width) * 100}%`,
                  width: `${((det.xMax - det.xMin) / imageDimensions.width) * 100}%`,
                  height: `${((det.yMax - det.yMin) / imageDimensions.height) * 100}%`,
                  borderColor: getColorForClass(det.label),
                  borderWidth: `${borderWidth}px`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {/* The content of the tooltip, displaying the formatted class label and confidence score. */}
              <p className="font-inter">{`${formatLabel(det.label)}: ${formatConfidence(det.confidence)}`}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  }
);

EditorBoundingBox.displayName = "EditorBoundingBox";
