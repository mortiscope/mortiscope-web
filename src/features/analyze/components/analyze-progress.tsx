"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { BsListCheck } from "react-icons/bs";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { IoImageOutline } from "react-icons/io5";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type AnalyzeWizardStatus, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useMediaQuery } from "@/hooks/use-media-query";
import { CIRCLE_ANIMATION_DURATION, LINE_ANIMATION_DURATION } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AnalyzeProgressProps {
  /**
   * The current active step number in the analysis process.
   */
  currentStep: number;
}

/**
 * An array that defines the configuration for each step in the analysis process.
 * Each object contains an ID, a display name, and a corresponding icon component.
 */
export const analysisSteps: {
  id: number;
  name: string;
  icon: React.ElementType;
  status: AnalyzeWizardStatus;
}[] = [
  { id: 1, name: "Analysis Details", icon: HiOutlineClipboardDocumentList, status: "details" },
  { id: 2, name: "Provide an Image", icon: IoImageOutline, status: "upload" },
  { id: 3, name: "Review and Submit", icon: BsListCheck, status: "review" },
];

/**
 * Renders a responsive, multi-step progress bar component.
 * It visually indicates completed, current, and upcoming steps in a process.
 * @param {AnalyzeProgressProps} props The component's props.
 */
export const AnalyzeProgress = ({ currentStep }: AnalyzeProgressProps) => {
  // The store action to navigate directly to a specific step by its status.
  const setStatus = useAnalyzeStore((state) => state.setStatus);
  // Get the wizard status to check if the analysis has been submitted.
  const wizardStatus = useAnalyzeStore((state) => state.status);
  // Determines if the viewport matches a large screen size for responsive rendering.
  const isLg = useMediaQuery("(min-width: 1024px)");
  // Determines if the viewport is larger than the small screen breakpoint.
  const isSm = useMediaQuery("(min-width: 640px)");

  const prevStepRef = useRef(currentStep);
  useEffect(() => {
    prevStepRef.current = currentStep;
  }, [currentStep]);
  const isGoingBackward = currentStep < prevStepRef.current;

  // Determine if the form has been submitted (is in the "processing" state).
  const isSubmitted = wizardStatus === "processing";

  const circleVariants = {
    inactive: { borderColor: "#cbd5e1", backgroundColor: "#ffffff", scale: 1 },
    current: { borderColor: "#059669", backgroundColor: "#ffffff", scale: 1.1 },
    completed: {
      borderColor: "#059669",
      backgroundColor: "#059669",
      scale: 1,
    },
  };

  return (
    <nav aria-label="Progress">
      <ol role="list" className="font-inter flex items-center">
        {analysisSteps.map((step, stepIdx) => {
          // Determine the state of the current step in the loop.
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const Icon = step.icon;

          // A step is clickable only if it's completed and the form hasn't been submitted.
          const isClickable = isCompleted && !isSubmitted;

          let circleDelay = 0;
          let lineDelay = 0;

          if (isGoingBackward) {
            // This step is the destination of the backward jump.
            if (isCurrent) {
              const stepsToJump = prevStepRef.current - currentStep;
              const totalLineAnimationTime = stepsToJump * LINE_ANIMATION_DURATION;
              circleDelay = CIRCLE_ANIMATION_DURATION + totalLineAnimationTime;
            }
            // This step is an intermediate step between the destination and the source.
            else if (step.id > currentStep && step.id < prevStepRef.current) {
              const prevStepIndex = prevStepRef.current - 1;
              const animationOrder = prevStepIndex - 1 - stepIdx;
              circleDelay =
                CIRCLE_ANIMATION_DURATION +
                animationOrder * LINE_ANIMATION_DURATION +
                LINE_ANIMATION_DURATION;
            }
            // This is a line that needs to "un-fill" sequentially.
            const prevStepIndex = prevStepRef.current - 1;
            if (stepIdx >= currentStep - 1 && stepIdx < prevStepIndex) {
              // The right-most line animates first. Each line to its left is delayed.
              const animationOrder = prevStepIndex - 1 - stepIdx;
              lineDelay = CIRCLE_ANIMATION_DURATION + animationOrder * LINE_ANIMATION_DURATION;
            }
          } else if (isCurrent) {
            // When going forward, the destination circle only needs to wait for one line to fill.
            circleDelay = LINE_ANIMATION_DURATION;
          }

          // Define a transition for the icon swap animation
          const iconTransition = {
            duration: 0.2,
            delay: circleDelay,
          };

          const handleStepClick = () => {
            // Allow navigation only if the step is clickable.
            if (isClickable && setStatus) {
              // Use the 'status' string to update the store, not the numeric ID.
              setStatus(step.status);
            }
          };

          const StepIcon = (
            <motion.span
              onClick={handleStepClick}
              className={cn(
                "group flex flex-shrink-0 items-center justify-center rounded-full border-2",
                isSm ? "h-10 w-10" : "h-8 w-8",
                // Set cursor based on whether the step is clickable or disabled.
                isClickable ? "cursor-pointer" : "",
                isSubmitted && isCompleted ? "cursor-not-allowed" : ""
              )}
              variants={circleVariants}
              animate={isCompleted ? "completed" : isCurrent ? "current" : "inactive"}
              transition={{
                duration: CIRCLE_ANIMATION_DURATION,
                ease: "easeInOut",
                delay: circleDelay,
              }}
            >
              {/* Animate icon visibility instead of conditional rendering */}
              <div
                className={cn(
                  "relative flex items-center justify-center",
                  isSm ? "h-6 w-6" : "h-5 w-5"
                )}
              >
                {/* The Check Icon (visible only when completed) */}
                <motion.div
                  initial={false}
                  animate={{ opacity: isCompleted ? 1 : 0, scale: isCompleted ? 1 : 0 }}
                  transition={iconTransition}
                  className="absolute h-full w-full"
                >
                  <Check className="h-full w-full text-white" aria-hidden="true" />
                </motion.div>

                {/* The Step Icon (visible only when not completed) */}
                <motion.div
                  initial={false}
                  animate={{ opacity: isCompleted ? 0 : 1, scale: isCompleted ? 0 : 1 }}
                  transition={iconTransition}
                  className="absolute h-full w-full"
                >
                  <Icon
                    className={cn(
                      "h-full w-full transition-all duration-300 ease-in-out",
                      isCurrent ? "text-emerald-600" : "text-slate-400",
                      isCurrent && "group-hover:scale-110 group-hover:rotate-12"
                    )}
                    aria-hidden="true"
                  />
                </motion.div>
              </div>
            </motion.span>
          );

          // Using React.Fragment to avoid adding an unnecessary DOM element for the list key.
          return (
            <React.Fragment key={step.name}>
              <li className={cn("relative z-10 flex items-center", isSm ? "gap-x-3" : "gap-x-2")}>
                {isLg ? (
                  StepIcon
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>{StepIcon}</div>
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
                <div className={cn("relative h-0.5 w-full flex-1", isSm ? "mx-4" : "mx-2")}>
                  <div className="absolute inset-0 h-full w-full bg-slate-200" />
                  <motion.div
                    className="absolute inset-0 h-full bg-emerald-600"
                    initial={false}
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{
                      duration: LINE_ANIMATION_DURATION,
                      ease: "easeInOut",
                      delay: lineDelay,
                    }}
                    aria-hidden="true"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
