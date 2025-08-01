import { AnimatePresence, motion } from "framer-motion";
import React, { memo } from "react";
import { FaHourglassHalf } from "react-icons/fa";

import { Card, CardTitle } from "@/components/ui/card";
import { PmiWidgetToolbar, type TimeUnit } from "@/features/results/components/pmi-widget-toolbar";

/**
 * Defines the props for the PmiWidget component.
 */
interface PmiWidgetProps {
  /** The estimated PMI value to display. Can be null or undefined if no estimation is available. */
  pmiValue: number | null | undefined;
  /** The currently selected time unit for displaying the PMI value (e.g., 'Hours'). */
  selectedUnit: TimeUnit;
  /** A callback function to handle the selection of a new time unit. */
  onUnitSelect: (unit: TimeUnit) => void;
  /** A callback function to open the information panel. */
  onInfoClick: () => void;
  /** A boolean to determine whether to display the PMI value or a placeholder message. */
  hasEstimation: boolean;
  /** A boolean that determines if the information button should be enabled. */
  isInfoButtonEnabled: boolean;
  /** A boolean to indicate if the current estimation is outdated and needs recalculation. */
  isRecalculationNeeded: boolean;
}

/**
 * A memoized component that displays the Post-Mortem Interval (PMI) estimation in a dedicated widget.
 * It orchestrates the `PmiWidgetToolbar` and animates the display of the PMI value based on its
 * availability and the selected time unit.
 */
export const PmiWidget = memo(
  ({
    pmiValue,
    selectedUnit,
    hasEstimation,
    isInfoButtonEnabled,
    ...toolbarProps
  }: PmiWidgetProps) => {
    return (
      <Card className="relative col-span-1 flex h-52 flex-col justify-between overflow-hidden rounded-3xl border-none bg-white p-6 shadow-none transition-all duration-300 md:p-8 lg:col-span-2">
        {/* A decorative background icon for visual styling. */}
        <FaHourglassHalf className="absolute -right-4 -bottom-4 h-20 w-20 text-slate-400 opacity-20" />
        {/* The main header section containing the widget title and the interactive toolbar. */}
        <div className="flex items-center justify-between">
          <div className="relative flex items-center gap-2">
            <FaHourglassHalf className="h-4 w-4 flex-shrink-0 text-slate-600" />
            <CardTitle className="font-inter text-sm font-normal text-slate-900">
              PMI Estimation
            </CardTitle>
          </div>
          {/* Renders the toolbar with controls for time unit selection and information. */}
          <PmiWidgetToolbar
            selectedUnit={selectedUnit}
            hasEstimation={hasEstimation}
            isInfoButtonEnabled={isInfoButtonEnabled}
            {...toolbarProps}
          />
        </div>
        {/* The main display area for the PMI value. */}
        <div className="font-plus-jakarta-sans relative h-20 overflow-hidden">
          {/* Manages the animated transition between the estimated value and the "No estimation" message. */}
          <AnimatePresence mode="wait">
            {hasEstimation && typeof pmiValue === "number" ? (
              // Renders the estimated PMI value when available.
              <motion.div
                key={selectedUnit}
                className="absolute bottom-0 flex w-full flex-wrap items-baseline gap-x-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <span className="text-5xl font-medium text-slate-800">{pmiValue.toFixed(2)}</span>
                <span className="text-4xl text-slate-500">{selectedUnit}</span>
              </motion.div>
            ) : (
              // Renders a placeholder message when no estimation is available.
              <motion.p
                key="no-estimation"
                className="absolute bottom-0 w-full text-3xl text-slate-500 lg:text-4xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No estimation.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </Card>
    );
  }
);

PmiWidget.displayName = "PmiWidget";
