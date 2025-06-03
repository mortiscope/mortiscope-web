"use-client";

import { Check } from "lucide-react";
import React from "react";
import { BsListCheck } from "react-icons/bs";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { IoImageOutline } from "react-icons/io5";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface AnalyzeProgressProps {
  /** The current active step number in the analysis process. */
  currentStep: number;
}

/**
 * An exported array that defines the configuration for each step in the analysis process.
 * Each object contains an ID, a display name, and a corresponding icon component.
 */
export const analysisSteps = [
  { id: 1, name: "Provide an Image", icon: IoImageOutline },
  { id: 2, name: "Analysis Details", icon: HiOutlineClipboardDocumentList },
  { id: 3, name: "Review and Submit", icon: BsListCheck },
];

/**
 * Renders a responsive, multi-step progress bar component.
 * It visually indicates completed, current, and upcoming steps in a process.
 * On smaller screens, step names are shown in tooltips; on larger screens, they are displayed next to the icons.
 *
 * @param {AnalyzeProgressProps} props The component's props.
 */
export const AnalyzeProgress = ({ currentStep }: AnalyzeProgressProps) => {
  // Determines if the viewport matches a large screen size for responsive rendering.
  const isLg = useMediaQuery("(min-width: 1024px)");

  return (
    <nav aria-label="Progress">
      <ol role="list" className="font-inter flex items-center">
        {analysisSteps.map((step, stepIdx) => {
          // Determine the state of the current step in the loop.
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const Icon = step.icon;

          // A reusable JSX element for the circular step icon.
          const StepIcon = (
            <span
              className={cn(
                "group flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-300 ease-in-out",
                isCompleted
                  ? "bg-emerald-600"
                  : isCurrent
                    ? "border-2 border-emerald-600"
                    : "border-2 border-slate-300",
                !isCompleted && "hover:scale-110",
                !isCompleted && !isCurrent && "hover:border-emerald-400"
              )}
            >
              {isCompleted ? (
                // Show a checkmark for completed steps.
                <Check className="h-6 w-6 text-white" aria-hidden="true" />
              ) : (
                // Show the designated icon for current or upcoming steps.
                <Icon
                  className={cn(
                    "h-6 w-6 transition-all duration-300 ease-in-out",
                    isCurrent ? "text-emerald-600" : "text-slate-400",
                    isCurrent ? "group-hover:rotate-12" : "group-hover:text-emerald-600"
                  )}
                  aria-hidden="true"
                />
              )}
            </span>
          );

          // Using React.Fragment to avoid adding an unnecessary DOM element for the list key.
          return (
            <React.Fragment key={step.name}>
              <li className="flex items-center gap-x-3">
                {isLg ? (
                  StepIcon
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer">{StepIcon}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-inter">{step.name}</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* The step name, visible only on large screens. */}
                <span
                  className={cn(
                    "hidden text-sm font-medium lg:block",
                    isCurrent ? "text-emerald-600" : "text-slate-500",
                    isCompleted && "text-slate-800"
                  )}
                >
                  {step.name}
                </span>
              </li>

              {/* Renders the connecting line between steps, but not after the last one. */}
              {stepIdx < analysisSteps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-full flex-1 lg:mx-4",
                    isCompleted ? "bg-emerald-600" : "bg-slate-200"
                  )}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
