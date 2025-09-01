"use client";

import dynamic from "next/dynamic";
import { type UseFormReturn } from "react-hook-form";

import { CaseLocationInput } from "@/features/cases/components/case-location-input";
import { CaseNameInput } from "@/features/cases/components/case-name-input";
import { CaseTemperatureInput } from "@/features/cases/components/case-temperature-input";
import { type Address } from "@/features/cases/hooks/use-philippine-address";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";

/**
 * Dynamically loads the case date input component on the client-side only.
 */
const CaseDateInput = dynamic(
  () =>
    import("@/features/cases/components/case-date-input").then((module) => module.CaseDateInput),
  {
    ssr: false,
    loading: () => <div className="h-[124px] w-full" />,
  }
);

/**
 * Defines the props for the edit case form component.
 */
interface EditCaseFormProps {
  /** The `react-hook-form` instance, passed down to connect the inputs to the form state. */
  form: UseFormReturn<CaseDetailsFormInput>;
  /** A state object that manages the lock status of each field group. */
  lockedFields: {
    caseName: boolean;
    caseDate: boolean;
    temperature: boolean;
    location: boolean;
  };
  /** A handler function to toggle the lock state for a specific field group. */
  toggleLock: (field: "caseName" | "caseDate" | "temperature" | "location") => void;
  /** The list of regions to populate the location dropdown. */
  regionList: Address[];
  /** The list of provinces to populate the location dropdown. */
  provinceList: Address[];
  /** The list of cities/municipalities to populate the location dropdown. */
  cityList: Address[];
  /** The list of barangays to populate the location dropdown. */
  barangayList: Address[];
}

/**
 * A presentational or dumb component that renders the form fields for editing case details.
 */
export const EditCaseForm = ({
  form,
  lockedFields,
  toggleLock,
  regionList,
  provinceList,
  cityList,
  barangayList,
}: EditCaseFormProps) => {
  return (
    <div className="space-y-8 p-6">
      {/* Renders the input for the case name. */}
      <CaseNameInput
        control={form.control}
        isLocked={lockedFields.caseName}
        onToggleLock={() => toggleLock("caseName")}
      />
      {/* Renders the dynamically loaded date and time input component. */}
      <CaseDateInput
        form={form}
        variant="stacked"
        showSwitch={false}
        isLocked={lockedFields.caseDate}
        onToggleLock={() => toggleLock("caseDate")}
      />
      {/* Renders the input for the temperature. */}
      <CaseTemperatureInput
        control={form.control}
        isLocked={lockedFields.temperature}
        showSwitch={false}
        onToggleLock={() => toggleLock("temperature")}
      />
      {/* Renders the set of cascading dropdowns for the location. */}
      <CaseLocationInput
        form={form}
        variant="stacked"
        regionList={regionList}
        provinceList={provinceList}
        cityList={cityList}
        barangayList={barangayList}
        isLocked={lockedFields.location}
        onToggleLock={() => toggleLock("location")}
      />
    </div>
  );
};

EditCaseForm.displayName = "EditCaseForm";
