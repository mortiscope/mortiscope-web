"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateCase } from "@/features/cases/actions/update-case";
import { usePhilippineAddress } from "@/features/cases/hooks/use-philippine-address";
import {
  type CaseDetailsFormData,
  type CaseDetailsFormInput,
  caseDetailsSchema,
} from "@/features/cases/schemas/case-details";
import { type CaseWithRelations } from "@/features/results/components/results-view";
import { useResultsStore } from "@/features/results/store/results-store";

/**
 * Defines the props for the `useEditCaseForm` hook.
 */
interface UseEditCaseFormProps {
  /** The full case data object, used to populate the form's default values. */
  caseData: CaseWithRelations;
  /** A callback function to be executed after a successful form submission, typically to close the form sheet. */
  onSheetClose: () => void;
}

/**
 * A comprehensive smart hook to manage all the state and logic for the case editing form.
 * It orchestrates `react-hook-form`, handles cascading address dropdowns, manages interface state
 * like locked fields and tabs, and executes the server-side update mutation.
 */
export const useEditCaseForm = ({ caseData, onSheetClose }: UseEditCaseFormProps) => {
  const queryClient = useQueryClient();
  // Retrieves an action from the global Zustand store to mark a case for recalculation.
  const markForRecalculation = useResultsStore((state) => state.markForRecalculation);

  // Local state for UI elements within the form.
  const [activeTab, setActiveTab] = React.useState("details");
  const [lockedFields, setLockedFields] = React.useState({
    caseName: true,
    caseDate: true,
    temperature: true,
    location: true,
  });

  // Track whether initial form population is complete to prevent auto-setting interference
  const [isInitialPopulationComplete, setIsInitialPopulationComplete] = React.useState(false);

  /** A helper function to toggle the locked/unlocked state of a form field section. */
  const toggleLock = (field: keyof typeof lockedFields) => {
    setLockedFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // Initializes `react-hook-form` with Zod validation and default values mapped from `caseData`.
  const form = useForm<CaseDetailsFormInput>({
    resolver: zodResolver(caseDetailsSchema),
    mode: "onChange",
    defaultValues: {
      caseName: caseData.caseName,
      caseDate: caseData.caseDate,
      temperature: { value: caseData.temperatureCelsius, unit: "C" },
      location: {
        region: { name: caseData.locationRegion, code: "" },
        province: { name: caseData.locationProvince, code: "" },
        city: { name: caseData.locationCity, code: "" },
        barangay: { name: caseData.locationBarangay, code: "" },
      },
      notes: caseData.notes ?? "",
    },
  });

  // `watch` is used to subscribe to changes in the location fields, which triggers the
  const watchedRegion = form.watch("location.region");
  const watchedProvince = form.watch("location.province");
  const watchedCity = form.watch("location.city");

  // A custom hook that fetches the cascading lists of Philippine addresses.
  const addressData = usePhilippineAddress({
    regionCode: watchedRegion?.code,
    provinceCode: watchedProvince?.code,
    cityCode: watchedCity?.code,
  });

  // Series of `useEffect` hooks critical for initializing the form's address fields.
  React.useEffect(() => {
    if (
      !isInitialPopulationComplete &&
      caseData.locationRegion &&
      addressData.regionList.length > 0 &&
      !watchedRegion?.code
    ) {
      const matched = addressData.regionList.find((r) => r.name === caseData.locationRegion);
      if (matched) {
        form.setValue("location.region", matched, { shouldValidate: true });
      }
    }
  }, [
    addressData.regionList,
    caseData.locationRegion,
    form,
    watchedRegion,
    isInitialPopulationComplete,
  ]);

  React.useEffect(() => {
    if (
      !isInitialPopulationComplete &&
      watchedRegion?.code &&
      caseData.locationProvince &&
      addressData.provinceList.length > 0 &&
      !watchedProvince?.code
    ) {
      const matched = addressData.provinceList.find((p) => p.name === caseData.locationProvince);
      if (matched) {
        form.setValue("location.province", matched, { shouldValidate: true });
      }
    }
  }, [
    addressData.provinceList,
    caseData.locationProvince,
    form,
    watchedProvince,
    watchedRegion,
    isInitialPopulationComplete,
  ]);

  React.useEffect(() => {
    if (
      !isInitialPopulationComplete &&
      watchedProvince?.code &&
      caseData.locationCity &&
      addressData.cityList.length > 0 &&
      !watchedCity?.code
    ) {
      const matched = addressData.cityList.find((c) => c.name === caseData.locationCity);
      if (matched) {
        form.setValue("location.city", matched, { shouldValidate: true });
      }
    }
  }, [
    addressData.cityList,
    caseData.locationCity,
    form,
    watchedCity,
    watchedProvince,
    isInitialPopulationComplete,
  ]);

  React.useEffect(() => {
    if (
      !isInitialPopulationComplete &&
      watchedCity?.code &&
      caseData.locationBarangay &&
      addressData.barangayList.length > 0
    ) {
      const matched = addressData.barangayList.find((b) => b.name === caseData.locationBarangay);
      if (matched) {
        form.setValue("location.barangay", matched, { shouldValidate: true });
        // Mark initial population as complete after setting the final field
        setIsInitialPopulationComplete(true);
      }
    }
  }, [
    addressData.barangayList,
    caseData.locationBarangay,
    form,
    watchedCity,
    isInitialPopulationComplete,
  ]);

  // Fallback to mark initial population complete if all address data is loaded but no barangay match
  React.useEffect(() => {
    if (
      !isInitialPopulationComplete &&
      addressData.regionList.length > 0 &&
      addressData.provinceList.length > 0 &&
      addressData.cityList.length > 0 &&
      addressData.barangayList.length > 0 &&
      watchedRegion?.code &&
      watchedProvince?.code &&
      watchedCity?.code
    ) {
      // If we have all the data loaded and all fields populated, mark as complete
      setIsInitialPopulationComplete(true);
    }
  }, [
    isInitialPopulationComplete,
    addressData.regionList.length,
    addressData.provinceList.length,
    addressData.cityList.length,
    addressData.barangayList.length,
    watchedRegion?.code,
    watchedProvince?.code,
    watchedCity?.code,
  ]);

  /**
   * Initializes a mutation with Tanstack Query for updating the case data on the server.
   * It handles success and error states, provides user feedback, and invalidates relevant queries.
   */
  const updateCaseMutation = useMutation({
    mutationFn: updateCase,
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(`${variables.details.caseName} edited successfully.`);
        // If the server indicates a recalculation is needed, mark it in the global client state.
        if (result.recalculationTriggered) markForRecalculation(caseData.id);

        // Invalidate multiple queries to ensure the UI is updated with the new data.
        queryClient.invalidateQueries({ queryKey: ["case", caseData.id] });
        queryClient.invalidateQueries({ queryKey: ["caseName", caseData.id] });
        queryClient.invalidateQueries({ queryKey: ["cases"] });
        queryClient.invalidateQueries({ queryKey: ["caseHistory", caseData.id] });

        // Triggers the parent component's callback to close the form sheet.
        onSheetClose();
      } else {
        toast.error(result.error || "Failed to update case.");
      }
    },
    onError: (error) => toast.error(`An unexpected error occurred: ${error.message}`),
  });

  /**
   * The submission handler passed to `react-hook-form`. It triggers the server mutation.
   */
  const onSubmit: SubmitHandler<CaseDetailsFormInput> = (data) => {
    updateCaseMutation.mutate({ caseId: caseData.id, details: data as CaseDetailsFormData });
  };

  // A derived boolean to control the disabled state of the submit button.
  const isButtonDisabled =
    updateCaseMutation.isPending || !form.formState.isValid || !form.formState.isDirty;

  // Exposes a single, unified API for the results edit case form component to consume.
  return {
    form,
    activeTab,
    setActiveTab,
    lockedFields,
    toggleLock,
    addressData,
    onSubmit,
    isButtonDisabled,
    isSubmitting: updateCaseMutation.isPending,
  };
};
