"use client";

import { motion } from "framer-motion";
import { AiOutlineRadarChart } from "react-icons/ai";
import { BsPieChart } from "react-icons/bs";
import {
  IoBarChartOutline,
  IoGridOutline,
  IoImagesOutline,
  IoPodiumOutline,
} from "react-icons/io5";
import { LuChartLine } from "react-icons/lu";
import { TbChartAreaLine } from "react-icons/tb";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2,
    },
  },
};

/**
 * Framer Motion variants for individual animated items within the modal.
 */
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 150,
    },
  },
};

/**
 * A reusable component for list items in the information modal.
 */
const InformationItem = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <li className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-200 ease-in-out hover:border-emerald-200 hover:bg-emerald-50">
    {/* First row for the icon and title */}
    <div className="flex items-center">
      <Icon className="mr-3 h-5 w-5 flex-shrink-0 text-emerald-500" />
      <h4 className="font-inter font-medium text-slate-800">{title}</h4>
    </div>
    {/* Second row for the paragraph */}
    <p className="font-inter mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
  </li>
);

interface CaseSummaryInformationModalProps {
  /** Controls whether the modal is currently open. */
  isOpen: boolean;
  /** A callback function to handle changes to the open state. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal dialog that provides information on the different chart types and data sources available in the Summary.
 */
export function CaseSummaryInformationModal({
  isOpen,
  onOpenChange,
}: CaseSummaryInformationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full max-h-[85vh] flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-lg md:h-auto md:rounded-3xl">
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Animated wrapper for the dialog header. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
            <DialogHeader className="text-center">
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
                Case Summary Information
              </DialogTitle>
              <DialogDescription className="font-inter text-center text-sm text-slate-600">
                A guide to interpreting the analytical visualizations.
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* Main content area */}
          <motion.div
            variants={itemVariants}
            className="flex-1 overflow-y-auto border-y border-slate-200 p-6"
          >
            <div className="space-y-4">
              <div>
                <h3 className="font-plus-jakarta-sans mb-3 text-lg font-semibold text-slate-800">
                  Chart Types
                </h3>
                <ul className="space-y-4">
                  <InformationItem icon={IoBarChartOutline} title="Bar Chart">
                    A bar chart represents data with rectangular bars, providing a direct comparison
                    of quantities for each life stage. It is highly effective for identifying the
                    most abundant stage, which is often the most developed and therefore critical
                    for PMI estimation.
                  </InformationItem>
                  <InformationItem icon={LuChartLine} title="Line Chart">
                    A line chart connects data points with a continuous line to visualize the
                    overall trend of the population&apos;s age distribution. A steep drop-off after
                    a certain stage, for instance, can indicate a recent mass emergence event.
                  </InformationItem>
                  <InformationItem icon={TbChartAreaLine} title="Composed Chart">
                    A composed chart combines a bar and line chart to offer a comprehensive view.
                    This format presents precise quantity comparisons (bars) while simultaneously
                    illustrating the developmental trend (line).
                  </InformationItem>
                  <InformationItem icon={BsPieChart} title="Pie Chart">
                    A pie chart displays data as slices of a circle, representing the percentage
                    breakdown of each life stage relative to the total population. It is ideal for
                    illustrating the overall composition of the specimens.
                  </InformationItem>
                  <InformationItem icon={AiOutlineRadarChart} title="Radar Chart">
                    A radar chart plots data on a circular grid, effective for identifying
                    imbalances or dominant life stages. A prominent axis immediately highlights a
                    high concentration for that particular stage.
                  </InformationItem>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-plus-jakarta-sans mb-3 text-lg font-semibold text-slate-800">
                  Data Sources
                </h3>
                <ul className="space-y-4">
                  <InformationItem icon={IoGridOutline} title="Overall">
                    This view aggregates counts from every image to provide a complete summary of
                    the total population. It offers the most holistic perspective for forming
                    overall conclusions.
                  </InformationItem>
                  <InformationItem icon={IoPodiumOutline} title="Maximum Stages">
                    For each life stage, this view identifies the single image with the highest
                    count and displays that value. This is important, as it isolates the piece of
                    evidence containing the most developed specimens.
                  </InformationItem>
                  <InformationItem icon={IoImagesOutline} title="Individual Images">
                    This option filters the chart to show the life stage distribution for one image
                    only. It is useful for granular analysis, such as examining a specific cluster
                    of specimens.
                  </InformationItem>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Dialog footer */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-2 pb-6">
            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
                className="font-inter relative mt-2 h-9 w-full cursor-pointer overflow-hidden rounded-lg border-none bg-emerald-600 px-6 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-green-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:mt-0 md:h-10 md:w-auto md:text-base"
              >
                Got It
              </Button>
            </DialogFooter>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
