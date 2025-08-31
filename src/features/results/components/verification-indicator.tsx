import React, { memo } from "react";

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
  ({ verificationStatus, className }: VerificationIndicatorProps) => {
    const { label, icon: Icon, color } = STATUS_CONFIG[verificationStatus];

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* The main container for the icon, with an aria-label for accessibility. */}
          <div className={cn("flex items-center justify-center", className)} aria-label={label}>
            {/* Renders the dynamically selected icon component with its corresponding color. */}
            <Icon className={cn("h-5 w-5", color)} />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-inter">{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
);

VerificationIndicator.displayName = "VerificationIndicator";
