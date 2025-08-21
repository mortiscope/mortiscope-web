import { motion, type Variants } from "framer-motion";
import { forwardRef, memo } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * The entry animation variants for the component's body.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the props for the edit image body component.
 */
type EditImageBodyProps = {
  /** The currently selected edit option. */
  editOption: "current_tab" | "new_tab";
  /** A callback function to update the selected edit option in the parent component's state. */
  onEditOptionChange: (value: "current_tab" | "new_tab") => void;
};

/**
 * A presentational component that renders the body content for the edit image modal.
 * It provides a radio group for the user to select how they want to open the annotation editor.
 */
export const EditImageBody = memo(
  forwardRef<HTMLDivElement, EditImageBodyProps>(({ editOption, onEditOptionChange }, ref) => (
    // The main animated container for the modal body
    <motion.div ref={ref} variants={itemVariants} className="shrink-0 overflow-hidden px-6 pt-2">
      <RadioGroup
        defaultValue={editOption}
        onValueChange={(value) => onEditOptionChange(value as "current_tab" | "new_tab")}
        className="gap-1.5 space-y-2"
      >
        {/* Open in current tab */}
        <Label
          htmlFor="current_tab"
          className={cn(
            "flex cursor-pointer flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300",
            editOption === "current_tab"
              ? "border-emerald-400 bg-emerald-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          )}
        >
          <div className="flex items-start">
            <RadioGroupItem
              value="current_tab"
              id="current_tab"
              className={cn(
                "focus-visible:ring-emerald-500/50",
                editOption === "current_tab" &&
                  "border-emerald-600 text-emerald-600 [&_svg]:fill-emerald-600"
              )}
            />
            <div className="ml-3">
              <span className="font-inter font-medium text-slate-800">Open in current tab</span>
              <p className="font-inter mt-1.5 text-sm font-normal text-slate-600">
                Navigate to the annotation editor in the current tab. It will replace the current
                page.
              </p>
            </div>
          </div>
        </Label>
        {/* Open in new tab */}
        <Label
          htmlFor="new_tab"
          className={cn(
            "flex cursor-pointer flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300",
            editOption === "new_tab"
              ? "border-emerald-400 bg-emerald-50"
              : "border-slate-200 bg-white hover:bg-slate-50"
          )}
        >
          <div className="flex items-start">
            <RadioGroupItem
              value="new_tab"
              id="new_tab"
              className={cn(
                "focus-visible:ring-emerald-500/50",
                editOption === "new_tab" &&
                  "border-emerald-600 text-emerald-600 [&_svg]:fill-emerald-600"
              )}
            />
            <div className="ml-3">
              <span className="font-inter font-medium text-slate-800">Open in new tab</span>
              <p className="font-inter mt-1.5 text-sm font-normal text-slate-600">
                Open the annotation editor in a new browser tab. It will keep the current page
                intact.
              </p>
            </div>
          </div>
        </Label>
      </RadioGroup>
    </motion.div>
  ))
);

EditImageBody.displayName = "EditImageBody";
