import { memo } from "react";
import { type UseFormReturn } from "react-hook-form";

import { LocationDropdown } from "@/components/location-dropdown";
import {
  sectionTitle,
  selectItemStyles,
  selectTriggerStyles,
  uniformInputStyles,
} from "@/features/cases/constants/styles";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";

type AddressPart = { code: string; name: string };

type CaseLocationInputProps = {
  form: UseFormReturn<CaseDetailsFormInput>;
  regionList: AddressPart[];
  provinceList: AddressPart[];
  cityList: AddressPart[];
  barangayList: AddressPart[];
  className?: string;
  variant?: "grid" | "stacked";
  isLocked?: boolean;
  onToggleLock?: () => void;
};

/**
 * Renders a group of dependent dropdowns for selecting a Philippine address.
 * Now uses the global LocationDropdown component while maintaining all existing functionality.
 */
export const CaseLocationInput = memo(
  ({
    form,
    regionList,
    provinceList,
    cityList,
    barangayList,
    className,
    variant = "grid",
    isLocked = false,
    onToggleLock,
  }: CaseLocationInputProps) => {
    return (
      <LocationDropdown
        control={form.control}
        basePath="location"
        regionList={regionList}
        provinceList={provinceList}
        cityList={cityList}
        barangayList={barangayList}
        variant={variant}
        isLocked={isLocked}
        onToggleLock={onToggleLock}
        className={className}
        showLabel={true}
        labelText="Location"
        inputStyles={uniformInputStyles}
        labelStyles={sectionTitle}
        customSelectItemStyles={selectItemStyles}
        customSelectTriggerStyles={selectTriggerStyles}
      />
    );
  }
);

CaseLocationInput.displayName = "CaseLocationInput";
