import React, { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the verification indicator component.
 */
interface VerificationIndicatorProps {
  /** The status to display. */
  verificationStatus: keyof typeof STATUS_CONFIG;
  /** An optional class name to apply to the main container for custom sizing or positioning. */
  className?: string;
  /** Total number of detections (optional, used for percentage calculation). */
  totalDetections?: number;
  /** Number of verified detections (optional, used for percentage calculation). */
  verifiedDetections?: number;
  /** Whether to show the percentage as a badge (grid view) or just in tooltip (list view). */
  showBadge?: boolean;
}

/**
 * A memoized presentational component that displays a status icon with a corresponding tooltip.
 * It is driven by a configuration object to map a status string to a specific icon, color,
 * and label, making it a highly reusable indicator.
 *
 * @param {VerificationIndicatorProps} props The props for the component.
 * @returns A React component representing the status indicator.
 */
export const VerificationIndicator = memo(
  ({
    verificationStatus,
    className,
    totalDetections,
    verifiedDetections,
    showBadge = false,
  }: VerificationIndicatorProps) => {
    const { label, icon: Icon, color } = STATUS_CONFIG[verificationStatus];

    // Calculate percentage for progress status
    const percentage =
      verificationStatus === "in_progress" &&
      totalDetections !== undefined &&
      verifiedDetections !== undefined &&
      totalDetections > 0
        ? ((verifiedDetections / totalDetections) * 100).toFixed(1)
        : null;

    const displayLabel = percentage ? `${percentage}% ${label}` : label;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {percentage && showBadge ? (
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1.5 border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-700 hover:bg-sky-100",
                className
              )}
              aria-label={displayLabel}
            >
              <Icon className={cn("h-4 w-4", color)} />
              <span className="text-xs font-medium">{displayLabel}</span>
            </Badge>
          ) : (
            <div className={cn("flex items-center justify-center", className)} aria-label={label}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-inter">{displayLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
);

VerificationIndicator.displayName = "VerificationIndicator";
