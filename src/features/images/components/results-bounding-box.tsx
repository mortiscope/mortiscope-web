import React, { memo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Detection, type ImageFile } from "@/features/images/hooks/use-results-image-viewer";
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
}

/**
 * A memoized component that renders a scalable overlay of detection bounding boxes on an image.
 * It calculates the relative position and size of each box based on the original image dimensions
 * and applies them to the rendered image container, ensuring the boxes align correctly.
 */
export const ResultsBoundingBox = memo(
  ({ imageFile, imageDimensions, renderedImageStyle }: ResultsBoundingBoxProps) => {
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
        {imageFile.detections?.map((det: Detection) => (
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
                  borderWidth: "2px",
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
        ))}
      </div>
    );
  }
);

ResultsBoundingBox.displayName = "ResultsBoundingBox";
