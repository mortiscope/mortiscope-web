"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { PiCalendarCheck } from "react-icons/pi";
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
  "font-inter cursor-pointer border-2 border-transparent text-xs transition-colors duration-300 ease-in-out focus:border-emerald-200 focus:bg-emerald-100 focus:text-emerald-400 md:text-sm whitespace-nowrap";
const sectionTitle = "text-medium font-inter font-normal text-slate-800 mb-2";

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

  // Retrieves state and actions from the Zustand store for managing the multi-step form.
  const { nextStep, prevStep, updateDetailsData, setCaseId, details, caseId, step } =
    useAnalyzeStore();

  // State variables to hold the dynamic lists for regions, provinces, cities, and barangays.
  const [regionList, setRegionList] = useState<AddressPart[]>([]);
  const [provinceList, setProvinceList] = useState<AddressPart[]>([]);
  const [cityList, setCityList] = useState<AddressPart[]>([]);
  const [barangayList, setBarangayList] = useState<AddressPart[]>([]);

  // Initializes `react-hook-form` with Zod for validation and sets default values from the store.
  const form = useForm<DetailsFormInput>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      caseName: details.caseName ?? "",
      caseDate: details.caseDate,
      location: details.location,
      temperature: {
        value: details.temperature?.value?.toString() ?? "",
        unit: details.temperature?.unit ?? "C",
      },
    },
    mode: "onChange",
  });

  // TanStack Query mutation for handling the async call to the `createCase` server action.
  const createCaseMutation = useMutation({
    mutationFn: createCase,
    onSuccess: (result, submittedData) => {
      if (result.success && result.data) {
        toast.success("Case details have been saved.");
        updateDetailsData(submittedData as DetailsFormData);
        setCaseId(result.data.caseId);
        // Invalidate the 'cases' query to ensure the list is refetched when the user navigates back to the results page.
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
    onSuccess: (result, submittedData) => {
      if (result.success) {
        toast.success("Case details have been updated.");
        updateDetailsData(submittedData.details);
        // Also invalidate on update to reflect changes everywhere.
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

  // Fetch provinces when region changes
  useEffect(() => {
    if (watchedRegion?.code) {
      provinces(watchedRegion.code).then((data: Province[]) => {
        const formatted = data.map((p) => ({ code: p.province_code, name: p.province_name }));
        const uniqueProvinces = Array.from(
          new Map(formatted.map((item) => [item.code, item])).values()
        );
        setProvinceList(uniqueProvinces);
      });
    } else {
      setProvinceList([]);
    }
  }, [watchedRegion]);

  // Fetch cities when province changes
  useEffect(() => {
    if (watchedProvince?.code) {
      cities(watchedProvince.code).then((data: City[]) => {
        const formatted = data.map((c) => ({ code: c.city_code, name: c.city_name }));
        setCityList(formatted);
      });
    } else {
      setCityList([]);
    }
  }, [watchedProvince]);

  // Fetch barangays when city changes
  useEffect(() => {
    if (watchedCity?.code) {
      barangays(watchedCity.code).then((data: Barangay[]) => {
        const formatted = data.map((b) => ({ code: b.brgy_code, name: b.brgy_name }));
        setBarangayList(formatted);
      });
    } else {
      setBarangayList([]);
    }
  }, [watchedCity]);

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

  // Determines if any mutation is currently running to disable the submit button.
  const isPending = createCaseMutation.isPending || updateCaseMutation.isPending;

  return (
    // The main container for the form layout.
    <Card className="font-inter border-none py-2 shadow-none">
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
                              <Select
                                onValueChange={unitField.onChange}
                                defaultValue={unitField.value}
                              >
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

            {/* Section for the cascading address selection dropdowns. */}
            <div className="space-y-4">
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
            </div>
          </CardContent>

          <CardFooter className="flex justify-between gap-x-4 px-0 pt-6">
            {step > 1 && (
              <Button
                type="button"
                onClick={prevStep}
                disabled={isPending}
                className={cn(buttonClasses)}
              >
                Previous
              </Button>
            )}

            {/* Wrapper for next button.*/}
            <div
              className={cn("flex-1", {
                "cursor-not-allowed": !form.formState.isValid || isPending,
                "w-full": step === 1,
              })}
            >
              <Button
                type="submit"
                disabled={!form.formState.isValid || isPending}
                className={cn(buttonClasses, "w-full")}
              >
                {isPending ? "Saving..." : "Save and Continue"}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};
