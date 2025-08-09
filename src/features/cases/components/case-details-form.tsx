"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, type Variants } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { createCase } from "@/features/cases/actions/create-case";
import { updateCase } from "@/features/cases/actions/update-case";
import { CaseFormActions } from "@/features/cases/components/case-form-actions";
import { CaseLocationInput } from "@/features/cases/components/case-location-input";
import { CaseNameInput } from "@/features/cases/components/case-name-input";
import { CaseTemperatureInput } from "@/features/cases/components/case-temperature-input";
import { usePhilippineAddress } from "@/features/cases/hooks/use-philippine-address";
import {
  type CaseDetailsFormData,
  type CaseDetailsFormInput,
  caseDetailsSchema,
} from "@/features/cases/schemas/case-details";

// Dynamically import case date input and disable Server-Side Rendering (SSR).
const CaseDateInput = dynamic(
  () =>
    import("@/features/cases/components/case-date-input").then((module) => module.CaseDateInput),
  {
    ssr: false,
    loading: () => <div className="h-[124px] w-full" />,
  }
);

/**
 * Renders the form for the 'Details' step of the case creation process.
 * This "smart" component manages all state, logic, and data fetching for the form.
 */
export const CaseDetailsForm = () => {
  const queryClient = useQueryClient();

  const {
    nextStep,
    prevStep,
    caseId,
    status,
    details: persistedDetails,
    updateDetailsData,
    isHydrated,
    setCaseAndProceed,
  } = useAnalyzeStore();

  const form = useForm<CaseDetailsFormInput>({
    resolver: zodResolver(caseDetailsSchema),
    mode: "onChange",
    defaultValues: persistedDetails,
  });

  // Watches for changes in form fields to trigger dependent effects for the address hook.
  const watchedRegion = form.watch("location.region");
  const watchedProvince = form.watch("location.province");
  const watchedCity = form.watch("location.city");

  // Custom hook to manage address fetching logic.
  const { regionList, provinceList, cityList, barangayList } = usePhilippineAddress({
    regionCode: watchedRegion?.code,
    provinceCode: watchedProvince?.code,
    cityCode: watchedCity?.code,
  });

  // This effect synchronizes the form state with the persisted data from the Zustand store.
  useEffect(() => {
    if (persistedDetails && Object.keys(persistedDetails).length > 0) {
      form.reset(persistedDetails);
    }
  }, [persistedDetails, form]);

  // The following effects are crucial for re-populating the address dropdowns from persisted data.
  useEffect(() => {
    const persistedRegionName = persistedDetails?.location?.region?.name;
    if (persistedRegionName && regionList.length > 0) {
      const matchedRegion = regionList.find((r) => r.name === persistedRegionName);
      if (matchedRegion && form.getValues("location.region")?.code !== matchedRegion.code) {
        form.setValue("location.region", matchedRegion, { shouldValidate: true });
      }
    }
  }, [regionList, persistedDetails, form]);

  useEffect(() => {
    const persistedProvinceName = persistedDetails?.location?.province?.name;
    if (persistedProvinceName && provinceList.length > 0) {
      const matchedProvince = provinceList.find((p) => p.name === persistedProvinceName);
      if (matchedProvince && form.getValues("location.province")?.code !== matchedProvince.code) {
        form.setValue("location.province", matchedProvince, { shouldValidate: true });
      }
    }
  }, [provinceList, persistedDetails, form]);

  useEffect(() => {
    const persistedCityName = persistedDetails?.location?.city?.name;
    if (persistedCityName && cityList.length > 0) {
      const matchedCity = cityList.find((c) => c.name === persistedCityName);
      if (matchedCity && form.getValues("location.city")?.code !== matchedCity.code) {
        form.setValue("location.city", matchedCity, { shouldValidate: true });
      }
    }
  }, [cityList, persistedDetails, form]);

  useEffect(() => {
    const persistedBarangayName = persistedDetails?.location?.barangay?.name;
    if (persistedBarangayName && barangayList.length > 0) {
      const matchedBarangay = barangayList.find((b) => b.name === persistedBarangayName);
      if (matchedBarangay && form.getValues("location.barangay")?.code !== matchedBarangay.code) {
        form.setValue("location.barangay", matchedBarangay, { shouldValidate: true });
      }
    }
  }, [barangayList, persistedDetails, form]);

  // Defines the TanStack Query mutation for creating a new case.
  const createCaseMutation = useMutation({
    mutationFn: createCase,
    onSuccess: (result, variables) => {
      if (result.success && result.data) {
        updateDetailsData(variables);
        toast.success("Case details have been saved.");
        queryClient.invalidateQueries({ queryKey: ["cases"] });
        setCaseAndProceed(result.data.caseId);
      } else {
        toast.error(result.error || "An unknown error occurred while saving.");
      }
    },
    onError: (error) => toast.error(`An unexpected error occurred: ${error.message}`),
  });

  // Defines the TanStack Query mutation for updating an existing case.
  const updateCaseMutation = useMutation({
    mutationFn: updateCase,
    onSuccess: (result, variables) => {
      if (result.success) {
        updateDetailsData(variables.details);
        toast.success("Case details have been updated.");
        queryClient.invalidateQueries({ queryKey: ["cases"] });
        nextStep();
      } else {
        toast.error(result.error || "An unknown error occurred while updating.");
      }
    },
    onError: (error) => toast.error(`An unexpected error occurred: ${error.message}`),
  });

  /**
   * Handles form submission by deciding whether to create a new case or update an existing one.
   * @param data - The validated form data.
   */
  const onSubmit: SubmitHandler<CaseDetailsFormInput> = (data) => {
    const validatedData = data as CaseDetailsFormData;
    if (caseId) {
      updateCaseMutation.mutate({ caseId, details: validatedData });
    } else {
      createCaseMutation.mutate(validatedData);
    }
  };

  const isSaving = createCaseMutation.isPending || updateCaseMutation.isPending;

  // Prevents rendering the form until the Zustand store is rehydrated.
  if (!isHydrated) return null;

  // Animation variants for the form container
  const formVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={formVariants}>
      <Card className="font-inter relative border-none py-2 shadow-none">
        <CardHeader className="px-0 text-center">
          <CardTitle className="font-plus-jakarta-sans text-xl">Case Details</CardTitle>
          <CardDescription>Fill in the necessary information about the case.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-8 px-0">
              <CaseNameInput control={form.control} />
              <div className="grid grid-cols-1 items-start gap-x-4 gap-y-8 md:grid-cols-2">
                <CaseDateInput form={form} variant="horizontal" />
                <CaseTemperatureInput control={form.control} />
              </div>
              <CaseLocationInput
                form={form}
                variant="grid"
                regionList={regionList}
                provinceList={provinceList}
                cityList={cityList}
                barangayList={barangayList}
              />
            </CardContent>
            <CaseFormActions
              status={status}
              isSaving={isSaving}
              isValid={form.formState.isValid}
              onPrev={prevStep}
            />
          </form>
        </Form>
      </Card>
    </motion.div>
  );
};

CaseDetailsForm.displayName = "CaseDetailsForm";
