"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { BeatLoader } from "react-spinners";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { updateCase } from "@/features/cases/actions/update-case";
import { CaseLocationInput } from "@/features/cases/components/case-location-input";
import { CaseNameInput } from "@/features/cases/components/case-name-input";
import { CaseTemperatureInput } from "@/features/cases/components/case-temperature-input";
import { buttonClasses } from "@/features/cases/constants/styles";
import { usePhilippineAddress } from "@/features/cases/hooks/use-philippine-address";
import {
  type CaseDetailsFormData,
  type CaseDetailsFormInput,
  caseDetailsSchema,
} from "@/features/cases/schemas/case-details";
import { type CaseWithRelations } from "@/features/results/components/results-view";
import { useResultsStore } from "@/features/results/store/results-store";
import { cn } from "@/lib/utils";

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
 * Defines the props for the ResultsEditCaseForm component.
 */
interface ResultsEditCaseFormProps {
  /** The full case data object, used to populate the form's default values. */
  caseData: CaseWithRelations;
  /** A callback function to be executed after a successful form submission. */
  onSuccess: () => void;
}

/**
 * A smart form component for editing the details of an existing case. It manages form state,
 * handles cascading address dropdowns, and orchestrates the server-side update mutation.
 */
export const ResultsEditCaseForm = ({ caseData, onSuccess }: ResultsEditCaseFormProps) => {
  const queryClient = useQueryClient();
  const markForRecalculation = useResultsStore((state) => state.markForRecalculation);

  // Maps the initial server data to the format expected by the `react-hook-form` instance.
  const defaultFormValues: CaseDetailsFormInput = {
    caseName: caseData.caseName,
    caseDate: caseData.caseDate,
    temperature: {
      value: caseData.temperatureCelsius,
      unit: "C",
    },
    location: {
      region: { name: caseData.locationRegion, code: "" },
      province: { name: caseData.locationProvince, code: "" },
      city: { name: caseData.locationCity, code: "" },
      barangay: { name: caseData.locationBarangay, code: "" },
    },
  };

  // Initializes `react-hook-form` with Zod validation and the mapped default values.
  const form = useForm<CaseDetailsFormInput>({
    resolver: zodResolver(caseDetailsSchema),
    mode: "onChange",
    defaultValues: defaultFormValues,
  });

  // `watch` is used to subscribe to changes in the location fields.
  const watchedRegion = form.watch("location.region");
  const watchedProvince = form.watch("location.province");
  const watchedCity = form.watch("location.city");
  const watchedBarangay = form.watch("location.barangay");

  // A custom hook that fetches the cascading lists of Philippine addresses.
  const { regionList, provinceList, cityList, barangayList, isLoading } = usePhilippineAddress({
    regionCode: watchedRegion?.code,
    provinceCode: watchedProvince?.code,
    cityCode: watchedCity?.code,
  });

  useEffect(() => {
    if (caseData.locationRegion && regionList.length > 0 && !watchedRegion?.code) {
      const matched = regionList.find((r) => r.name === caseData.locationRegion);
      if (matched) form.setValue("location.region", matched);
    }
  }, [regionList, caseData.locationRegion, form, watchedRegion]);

  useEffect(() => {
    if (
      watchedRegion?.name === caseData.locationRegion &&
      caseData.locationProvince &&
      provinceList.length > 0 &&
      !watchedProvince?.code
    ) {
      const matched = provinceList.find((p) => p.name === caseData.locationProvince);
      if (matched) form.setValue("location.province", matched);
    }
  }, [
    provinceList,
    caseData.locationRegion,
    caseData.locationProvince,
    form,
    watchedProvince,
    watchedRegion,
  ]);

  useEffect(() => {
    if (
      watchedProvince?.name === caseData.locationProvince &&
      caseData.locationCity &&
      cityList.length > 0 &&
      !watchedCity?.code
    ) {
      const matched = cityList.find((c) => c.name === caseData.locationCity);
      if (matched) form.setValue("location.city", matched);
    }
  }, [
    cityList,
    caseData.locationProvince,
    caseData.locationCity,
    form,
    watchedCity,
    watchedProvince,
  ]);

  useEffect(() => {
    if (
      watchedCity?.name === caseData.locationCity &&
      caseData.locationBarangay &&
      barangayList.length > 0 &&
      !watchedBarangay?.code
    ) {
      const matched = barangayList.find((b) => b.name === caseData.locationBarangay);
      if (matched) form.setValue("location.barangay", matched);
    }
  }, [
    barangayList,
    caseData.locationCity,
    caseData.locationBarangay,
    form,
    watchedBarangay,
    watchedCity,
  ]);

  /**
   * Initializes a mutation with Tanstack Query for updating the case data on the server.
   * It handles success and error states, providing user feedback and invalidating relevant queries.
   */
  const updateCaseMutation = useMutation({
    mutationFn: updateCase,
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(`${variables.details.caseName} edited successfully.`);

        // If the server confirms the temperature changed, mark it for recalculation on the client.
        if (result.recalculationTriggered) {
          markForRecalculation(caseData.id);
        }

        // Invalidate multiple queries to ensure the interface is updated with the new data.
        const caseId = caseData.id;
        queryClient.invalidateQueries({ queryKey: ["case", caseId] });
        queryClient.invalidateQueries({ queryKey: ["caseName", caseId] });
        queryClient.invalidateQueries({ queryKey: ["cases"] });

        onSuccess();
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
  const isButtonDisabled = updateCaseMutation.isPending || !form.formState.isValid;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="font-inter flex min-h-0 flex-1 flex-col"
      >
        {/* The main scrollable area for the form inputs. */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <BeatLoader color="#16a34a" size={12} />
            </div>
          ) : (
            <div className="space-y-8 p-6">
              <CaseNameInput control={form.control} />
              <CaseDateInput form={form} layout="vertical" showSwitch={false} />
              <CaseTemperatureInput control={form.control} />
              <CaseLocationInput
                form={form}
                regionList={regionList}
                provinceList={provinceList}
                cityList={cityList}
                barangayList={barangayList}
                className="grid-cols-1 md:grid-cols-1"
              />
            </div>
          )}
        </div>
        {/* The form's footer. */}
        <CardFooter className="shrink-0 border-t-2 border-slate-200 p-4">
          <div className={cn("w-full", { "cursor-not-allowed": isButtonDisabled })}>
            <Button
              type="submit"
              disabled={isButtonDisabled}
              className={cn(buttonClasses, "w-full")}
            >
              {updateCaseMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Form>
  );
};
