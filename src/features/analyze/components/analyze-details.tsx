"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { PiCalendarCheck } from "react-icons/pi";
import { BeatLoader } from "react-spinners";
import { barangays, cities, provinces, regions } from "select-philippines-address";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createCase } from "@/features/analyze/actions/create-case";
import { updateCase } from "@/features/analyze/actions/update-case";
import {
  type DetailsFormData,
  type DetailsFormInput,
  detailsSchema,
} from "@/features/analyze/schemas/details";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { cn } from "@/lib/utils";

// Reusable Tailwind CSS class strings for consistent styling
const buttonClasses =
  "font-inter relative h-9 flex-1 cursor-pointer overflow-hidden rounded-lg border-none bg-emerald-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-green-600 hover:text-white hover:before:left-0 md:h-10 md:text-base";
const uniformInputStyles =
  "h-9 border-2 border-slate-200 text-sm placeholder:!text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 data-[state=open]:border-green-600 md:h-10";
const selectTriggerStyles = "data-[placeholder]:!text-slate-400";
const selectItemStyles =
  "font-inter cursor-pointer border-2 border-transparent text-xs transition-colors duration-300 ease-in-out focus:border-emerald-200 focus:bg-emerald-100 focus:text-emerald-400 md:text-sm whitespace-nownowrap";
const sectionTitle = "text-medium font-inter font-normal text-slate-800";

// Type definitions for address data from 'select-philippines-address'
type AddressPart = { code: string; name: string };
type Region = { region_code: string; region_name: string };
type Province = { province_code: string; province_name: string };
type City = { city_code: string; city_name: string };
type Barangay = { brgy_code: string; brgy_name: string };

/**
 * Checks if a given date is today.
 * @param date - The date to check.
 * @returns True if the date is today, false otherwise.
 */
const isDateToday = (date: Date | undefined): boolean => {
  if (!date) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Renders the form for the 'Details' step of the analysis process.
 * Manages state for case details and dynamically populates Philippine address dropdowns based on user selections.
 */
export const AnalyzeDetails = () => {
  // Get the query client instance.
  const queryClient = useQueryClient();

  // Retrieves state and actions from the Zustand store.
  const {
    nextStep,
    prevStep,
    caseId,
    setCaseId,
    status,
    details: persistedDetails,
    updateDetailsData,
    isHydrated,
  } = useAnalyzeStore();

  // State variables to hold the dynamic lists for regions, provinces, cities, and barangays.
  const [regionList, setRegionList] = useState<AddressPart[]>([]);
  const [provinceList, setProvinceList] = useState<AddressPart[]>([]);
  const [cityList, setCityList] = useState<AddressPart[]>([]);
  const [barangayList, setBarangayList] = useState<AddressPart[]>([]);

  // State to manage the initial loading of address data.
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Initializes `react-hook-form` with Zod for validation.
  const form = useForm<DetailsFormInput>({
    resolver: zodResolver(detailsSchema),
    mode: "onChange",
    defaultValues: persistedDetails,
  });

  // This effect runs once the store has been rehydrated from localStorage.
  useEffect(() => {
    if (isHydrated && persistedDetails && Object.keys(persistedDetails).length > 0) {
      form.reset(persistedDetails);
    }
  }, [isHydrated, persistedDetails, form]);

  // TanStack Query mutation for handling the async call to the `createCase` server action.
  const createCaseMutation = useMutation({
    mutationFn: createCase,
    onSuccess: (result, variables) => {
      if (result.success && result.data) {
        // This is crucial for the next step (upload) to work correctly.
        setCaseId(result.data.caseId);

        // Upon successful creation, update the store with the validated data to persist it.
        updateDetailsData(variables);
        toast.success("Case details have been saved.");
        queryClient.invalidateQueries({ queryKey: ["cases"] });
        nextStep();
      } else {
        toast.error(result.error || "An unknown error occurred while saving.");
      }
    },
    onError: (error) => {
      toast.error(`An unexpected error occurred: ${error.message}`);
    },
  });

  // A separate mutation for updating an existing case.
  const updateCaseMutation = useMutation({
    mutationFn: updateCase,
    onSuccess: (result, variables) => {
      if (result.success) {
        // Upon successful update, update the store with the validated data to persist it.
        updateDetailsData(variables.details);
        toast.success("Case details have been updated.");
        queryClient.invalidateQueries({ queryKey: ["cases"] });
        nextStep();
      } else {
        toast.error(result.error || "An unknown error occurred while updating.");
      }
    },
    onError: (error) => {
      toast.error(`An unexpected error occurred: ${error.message}`);
    },
  });

  // Watches for changes in form fields to trigger dependent effects.
  const caseDateValue = form.watch("caseDate");
  const watchedRegion = form.watch("location.region");
  const watchedProvince = form.watch("location.province");
  const watchedCity = form.watch("location.city");

  // Fetch regions on mount
  useEffect(() => {
    regions().then((data: Region[]) => {
      const formatted = data.map((r) => ({ code: r.region_code, name: r.region_name }));
      setRegionList(formatted);
    });
  }, []);

  // Fetch provinces only when a region is selected and the region list is available.
  useEffect(() => {
    const regionCode = watchedRegion?.code;
    // Ensure regionList is populated to prevent a race condition on refresh.
    if (regionCode && regionList.length > 0) {
      provinces(regionCode).then((data: Province[]) => {
        const formatted = data.map((p) => ({ code: p.province_code, name: p.province_name }));
        const uniqueProvinces = Array.from(
          new Map(formatted.map((item) => [item.code, item])).values()
        );
        setProvinceList(uniqueProvinces);
      });
    } else {
      setProvinceList([]);
    }
  }, [watchedRegion?.code, regionList]);

  // Fetch cities when province changes and the province list is available
  useEffect(() => {
    const provinceCode = watchedProvince?.code;
    if (provinceCode && provinceList.length > 0) {
      cities(provinceCode).then((data: City[]) => {
        const formatted = data.map((c) => ({ code: c.city_code, name: c.city_name }));
        setCityList(formatted);
      });
    } else {
      setCityList([]);
    }
  }, [watchedProvince?.code, provinceList]);

  // Fetch barangays when city changes and the city list is available
  useEffect(() => {
    const cityCode = watchedCity?.code;
    if (cityCode && cityList.length > 0) {
      barangays(cityCode).then((data: Barangay[]) => {
        const formatted = data.map((b) => ({ code: b.brgy_code, name: b.brgy_name }));
        setBarangayList(formatted);
      });
    } else {
      setBarangayList([]);
    }
  }, [watchedCity?.code, cityList]);

  // Effect to manage the initial loading state.
  useEffect(() => {
    if (!isHydrated) return;

    // If there are no persisted details, we are ready once the top-level region list is loaded.
    if (!persistedDetails?.location?.region?.code) {
      if (regionList.length > 0) setIsInitialLoading(false);
      return;
    }

    // Determine the deepest level of persisted address data.
    const hasPersistedBarangay = !!persistedDetails.location.barangay?.code;
    const hasPersistedCity = !!persistedDetails.location.city?.code;
    const hasPersistedProvince = !!persistedDetails.location.province?.code;

    // Check if the data for the deepest level has been loaded.
    if (hasPersistedBarangay && barangayList.length > 0) {
      setIsInitialLoading(false);
    } else if (hasPersistedCity && !hasPersistedBarangay && cityList.length > 0) {
      setIsInitialLoading(false);
    } else if (hasPersistedProvince && !hasPersistedCity && provinceList.length > 0) {
      setIsInitialLoading(false);
    } else if (!hasPersistedProvince && provinceList.length > 0) {
      // Handles case where only region was saved, and provinces are now loaded.
      setIsInitialLoading(false);
    }
  }, [isHydrated, persistedDetails, regionList, provinceList, cityList, barangayList]);

  /**
   * Handles form submission by deciding whether to create a new case or update an existing one.
   * @param data - The validated form data.
   */
  const onSubmit: SubmitHandler<DetailsFormInput> = (data) => {
    const validatedData = data as DetailsFormData;

    if (caseId) {
      updateCaseMutation.mutate({ caseId, details: validatedData });
    } else {
      createCaseMutation.mutate(validatedData);
    }
  };

  // Determines if the form is being saved.
  const isSaving = createCaseMutation.isPending || updateCaseMutation.isPending;

  // The main processing state combines initial loading and saving states to disable inputs.
  const isProcessing = isInitialLoading || isSaving;

  // Render nothing until the store has been hydrated from localStorage.
  // This prevents hydration mismatches and UI flicker.
  if (!isHydrated) {
    return null;
  }

  // Animation variants for the form container
  const formVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  return (
    // The main container for the form layout, now with entrance animation.
    <motion.div initial="hidden" animate="visible" variants={formVariants}>
      <Card className="font-inter relative border-none py-2 shadow-none">
        {/* Renders a loading overlay on top of the card ONLY during initial data load. */}
        {isInitialLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-2 rounded-lg bg-white/80 backdrop-blur-sm">
            <BeatLoader color="#16a34a" size={12} />
            <p className="font-plus-jakarta-sans p-2 text-center text-lg font-medium text-slate-700 md:text-xl">
              Loading form data...
            </p>
          </div>
        )}

        {/* Form header with title and description. */}
        <CardHeader className="px-0 text-center">
          <CardTitle className="font-plus-jakarta-sans text-xl">Analysis Details</CardTitle>
          <CardDescription>Fill in the necessary information about the case.</CardDescription>
        </CardHeader>

        {/* Wrapper for the form, providing context from react-hook-form. */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Main content area of the card. */}
            <CardContent className="space-y-8 px-0">
              {/* Field for entering the case name. */}
              <FormField
                control={form.control}
                name="caseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={sectionTitle}>Case Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter case name"
                        {...field}
                        value={field.value ?? ""}
                        className={cn(uniformInputStyles)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* A grid layout for the date and temperature fields. */}
              <div className="grid grid-cols-1 items-start gap-x-4 gap-y-8 md:grid-cols-2">
                {/* Field for selecting the case date. */}
                <FormField
                  control={form.control}
                  name="caseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className={sectionTitle}>Case Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                uniformInputStyles,
                                "w-full cursor-pointer justify-start text-left font-normal",
                                !field.value && "!text-slate-400"
                              )}
                            >
                              <PiCalendarCheck className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            autoFocus
                            className="font-inter"
                          />
                        </PopoverContent>
                      </Popover>
                      {/* A switch to quickly set the case date to the current date. */}
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          id="current-date-toggle"
                          className="cursor-pointer data-[state=checked]:bg-emerald-600"
                          checked={isDateToday(caseDateValue)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              form.setValue("caseDate", new Date(), { shouldValidate: true });
                            } else {
                              form.resetField("caseDate");
                            }
                          }}
                        />
                        <FormLabel
                          htmlFor="current-date-toggle"
                          className="font-inter text-xs font-normal text-slate-500 md:text-sm"
                        >
                          Set to Current Date
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Field for entering the temperature, combined with a unit selector. */}
                <FormField
                  control={form.control}
                  name="temperature.value"
                  render={({ field: { value, ...rest } }) => (
                    <FormItem>
                      <FormLabel className={sectionTitle}>Temperature</FormLabel>
                      <div className="flex items-start gap-2">
                        <div className="flex-grow">
                          <FormControl>
                            <Input
                              placeholder="Enter temperature"
                              type="text"
                              inputMode="decimal"
                              {...rest}
                              value={String(value ?? "")}
                              className={cn(
                                uniformInputStyles,
                                "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              )}
                            />
                          </FormControl>
                        </div>
                        {/* Field for the temperature unit selector (°C/°F). */}
                        <div>
                          <FormField
                            control={form.control}
                            name="temperature.unit"
                            render={({ field: unitField }) => (
                              <FormItem>
                                <FormLabel className="sr-only">Temperature Unit</FormLabel>
                                <Select onValueChange={unitField.onChange} value={unitField.value}>
                                  <FormControl>
                                    <SelectTrigger
                                      className={cn(
                                        uniformInputStyles,
                                        selectTriggerStyles,
                                        "w-[90px] cursor-pointer"
                                      )}
                                    >
                                      <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem className={selectItemStyles} value="C">
                                      °C
                                    </SelectItem>
                                    <SelectItem className={selectItemStyles} value="F">
                                      °F
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Location Section */}
              <FormItem>
                <FormLabel className={sectionTitle}>Location</FormLabel>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="location.region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Region</FormLabel>
                        <Select
                          value={field.value?.code || ""}
                          onValueChange={(code) => {
                            const region = regionList.find((r) => r.code === code) || null;
                            field.onChange(region);
                            form.setValue("location.province", null);
                            form.setValue("location.city", null);
                            form.setValue("location.barangay", null);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(
                                uniformInputStyles,
                                selectTriggerStyles,
                                "w-full cursor-pointer truncate"
                              )}
                            >
                              <SelectValue placeholder="Select Region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-72 overflow-x-auto">
                            {regionList.map((r) => (
                              <SelectItem key={r.code} value={r.code} className={selectItemStyles}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location.province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Province</FormLabel>
                        <Select
                          value={field.value?.code || ""}
                          onValueChange={(code) => {
                            const province = provinceList.find((p) => p.code === code) || null;
                            field.onChange(province);
                            form.setValue("location.city", null);
                            form.setValue("location.barangay", null);
                          }}
                          disabled={!watchedRegion || provinceList.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(
                                uniformInputStyles,
                                selectTriggerStyles,
                                "w-full cursor-pointer truncate"
                              )}
                            >
                              <SelectValue placeholder="Select Province" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-72 overflow-x-auto">
                            {provinceList.map((p) => (
                              <SelectItem key={p.code} value={p.code} className={selectItemStyles}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">City/Municipality</FormLabel>
                        <Select
                          value={field.value?.code || ""}
                          onValueChange={(code) => {
                            const city = cityList.find((c) => c.code === code) || null;
                            field.onChange(city);
                            form.setValue("location.barangay", null);
                          }}
                          disabled={!watchedProvince || cityList.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(
                                uniformInputStyles,
                                selectTriggerStyles,
                                "w-full cursor-pointer truncate"
                              )}
                            >
                              <SelectValue placeholder="Select City/Municipality" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-72 overflow-x-auto">
                            {cityList.map((c) => (
                              <SelectItem key={c.code} value={c.code} className={selectItemStyles}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location.barangay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="sr-only">Barangay</FormLabel>
                        <Select
                          value={field.value?.code || ""}
                          onValueChange={(code) => {
                            const barangay = barangayList.find((b) => b.code === code) || null;
                            field.onChange(barangay);
                          }}
                          disabled={!watchedCity || barangayList.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(
                                uniformInputStyles,
                                selectTriggerStyles,
                                "w-full cursor-pointer truncate"
                              )}
                            >
                              <SelectValue placeholder="Select Barangay" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-72 overflow-x-auto">
                            {barangayList.map((b) => (
                              <SelectItem key={b.code} value={b.code} className={selectItemStyles}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </FormItem>
            </CardContent>

            <CardFooter className="flex justify-between gap-x-4 px-0 pt-6">
              {status !== "details" && (
                <Button
                  type="button"
                  onClick={prevStep}
                  disabled={isProcessing}
                  className={cn(buttonClasses)}
                >
                  Previous
                </Button>
              )}

              {/* Wrapper for next button.*/}
              <div
                className={cn("flex-1", {
                  "cursor-not-allowed": !form.formState.isValid || isProcessing,
                  "w-full": status === "details",
                })}
              >
                <Button
                  type="submit"
                  disabled={!form.formState.isValid || isProcessing}
                  className={cn(buttonClasses, "w-full")}
                >
                  {isSaving ? "Saving..." : "Save and Continue"}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </motion.div>
  );
};
