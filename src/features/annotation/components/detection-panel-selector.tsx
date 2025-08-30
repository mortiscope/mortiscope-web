import { memo } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getLightenedColor } from "@/features/annotation/utils/lightened-color";
import { DETECTION_CLASS_COLORS, DETECTION_CLASS_ORDER } from "@/lib/constants";
import { formatLabel } from "@/lib/utils";

/**
 * Defines the props for the detection panel selector component.
 */
interface DetectionPanelSelectorProps {
  /** The currently selected class label. */
  selectedLabel: string;
  /** Callback to handle label changes. */
  onLabelChange: (newLabel: string) => void;
}

/**
 * A presentational component that renders a radio group for selecting the detection class label.
 * Each option is styled with the class-specific color and shows a lightened border when selected.
 *
 * @param {DetectionPanelSelectorProps} props The props for the component.
 * @returns A React component representing the class label selector.
 */
export const DetectionPanelSelector = memo(function DetectionPanelSelector({
  selectedLabel,
  onLabelChange,
}: DetectionPanelSelectorProps) {
  return (
    <div className="space-y-2">
      <RadioGroup
        value={selectedLabel}
        onValueChange={onLabelChange}
        className="gap-1.5 space-y-1.5"
      >
        {DETECTION_CLASS_ORDER.map((classLabel) => {
          const isSelected = selectedLabel === classLabel;
          const selectedColor = isSelected
            ? getLightenedColor(
                DETECTION_CLASS_COLORS[classLabel] || DETECTION_CLASS_COLORS.default
              )
            : null;

          return (
            <Label
              key={classLabel}
              htmlFor={classLabel}
              className="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-2.5 transition-all duration-200"
              style={{
                borderColor: selectedColor || "rgba(167, 243, 208, 0.4)",
                backgroundColor: isSelected ? "rgba(5, 150, 105)" : "rgba(16, 185, 129, 0.15)",
              }}
            >
              <RadioGroupItem
                value={classLabel}
                id={classLabel}
                className="focus-visible:ring-offset-0 [&_svg]:fill-current"
                style={{
                  borderColor: selectedColor || "rgba(167, 243, 208, 0.6)",
                  color: selectedColor || "#ffffff",
                }}
              />
              <span className="font-inter text-sm font-normal text-white">
                {formatLabel(classLabel)}
              </span>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
});

DetectionPanelSelector.displayName = "DetectionPanelSelector";
