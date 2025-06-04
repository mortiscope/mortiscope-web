"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { BsListCheck } from "react-icons/bs";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { IoImageOutline } from "react-icons/io5";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";
import { CIRCLE_ANIMATION_DURATION, LINE_ANIMATION_DURATION } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AnalyzeProgressProps {
  /** The current active step number in the analysis process. */
  currentStep: number;
}

/**
 * An array that defines the configuration for each step in the analysis process.
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

  const prevStepRef = useRef(currentStep);
  useEffect(() => {
    prevStepRef.current = currentStep;
  }, [currentStep]);
  const isGoingBackward = currentStep < prevStepRef.current;

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

          const isArriving = isGoingBackward && isCurrent;
          let circleDelay = 0;
          if (isArriving) {
            // When going backward, destination circle waits for the leaving circle and line.
            circleDelay = CIRCLE_ANIMATION_DURATION + LINE_ANIMATION_DURATION;
          } else if (!isGoingBackward && isCurrent) {
            // When going forward, destination circle waits for the line.
            circleDelay = LINE_ANIMATION_DURATION;
          }

          // Define a transition for the icon swap animation
          const iconTransition = {
            duration: 0.2,
            delay: circleDelay,
          };

          const StepIcon = (
            <motion.span
              className="group flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-2"
              variants={circleVariants}
              animate={isCompleted ? "completed" : isCurrent ? "current" : "inactive"}
              transition={{
                duration: CIRCLE_ANIMATION_DURATION,
                ease: "easeInOut",
                delay: circleDelay,
              }}
            >
              {/* Animate icon visibility instead of conditional rendering */}
              <div className="relative flex h-6 w-6 items-center justify-center">
                {/* The Check Icon (visible only when completed) */}
                <motion.div
                  initial={false}
                  animate={{ opacity: isCompleted ? 1 : 0, scale: isCompleted ? 1 : 0 }}
                  transition={iconTransition}
                  className="absolute"
                >
                  <Check className="h-full w-full text-white" aria-hidden="true" />
                </motion.div>

                {/* The Step Icon (visible only when not completed) */}
                <motion.div
                  initial={false}
                  animate={{ opacity: isCompleted ? 0 : 1, scale: isCompleted ? 0 : 1 }}
                  transition={iconTransition}
                  className="absolute"
                >
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-all duration-300 ease-in-out",
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
              <li className="relative z-10 flex items-center gap-x-3">
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
                <div className="relative h-0.5 w-full flex-1 lg:mx-4">
                  <div className="absolute inset-0 h-full w-full bg-slate-200" />
                  <motion.div
                    className="absolute inset-0 h-full bg-emerald-600"
                    initial={false}
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{
                      duration: LINE_ANIMATION_DURATION,
                      ease: "easeInOut",
                      delay: isGoingBackward ? CIRCLE_ANIMATION_DURATION : 0,
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
