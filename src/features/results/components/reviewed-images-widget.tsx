import React, { memo } from "react";
import { FaGlasses } from "react-icons/fa";

import { Card, CardTitle } from "@/components/ui/card";

/**
 * Defines the props for the ReviewedImagesWidget component.
 */
interface ReviewedImagesWidgetProps {
  /** Determines if a valid estimation exists, which controls whether to show the count or a placeholder. */
  hasEstimation: boolean;
  /** The number of images that have all detections verified. */
  reviewedCount: number;
  /** The total number of images in the case. */
  totalCount: number;
}

/**
 * A memoized component that displays the total number of images reviewed for the case.
 * It shows either the count or a placeholder message based on the `hasEstimation` prop.
 *
 * @param {ReviewedImagesWidgetProps} props The props for the component.
 * @returns A React component representing the reviewed images widget.
 */
export const ReviewedImagesWidget = memo(
  ({ hasEstimation, reviewedCount, totalCount }: ReviewedImagesWidgetProps) => {
    return (
      <Card className="relative col-span-1 flex h-52 flex-col justify-between overflow-hidden rounded-3xl border-none bg-white p-6 shadow-none transition-all duration-300 md:p-8 lg:col-span-2">
        {/* A decorative background icon for visual styling. */}
        <FaGlasses className="absolute -right-4 -bottom-4 h-20 w-20 text-slate-400 opacity-20" />
        {/* The main header section containing the widget title. */}
        <div className="flex items-center justify-between">
          <div className="relative flex items-center gap-2">
            <FaGlasses className="h-4 w-4 flex-shrink-0 text-slate-600" />
            <CardTitle className="font-inter text-sm font-normal text-slate-900">
              Reviewed Images
            </CardTitle>
          </div>
        </div>
        {/* The main display area for the image count or placeholder text. */}
        <div className="font-plus-jakarta-sans relative">
          {hasEstimation ? (
            // Renders the count of reviewed images when an estimation is available.
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-5xl font-medium text-slate-800">
                {reviewedCount} / {totalCount}
              </span>
              <span className="text-4xl text-slate-500">Images</span>
            </div>
          ) : (
            // Renders a placeholder message when no estimation is available.
            <p className="text-3xl text-slate-500 lg:text-4xl">No valid images.</p>
          )}
        </div>
      </Card>
    );
  }
);

ReviewedImagesWidget.displayName = "ReviewedImagesWidget";
