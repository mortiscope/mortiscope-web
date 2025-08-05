import { memo, useMemo } from "react";
import { type UseFormReturn } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  sectionTitle,
  selectItemStyles,
  selectTriggerStyles,
  uniformInputStyles,
} from "@/features/cases/constants/styles";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";
import { cn } from "@/lib/utils";

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
    const { control, watch, setValue } = form;
    const watchedRegion = watch("location.region");
    const watchedProvince = watch("location.province");
    const watchedCity = watch("location.city");

    const commonSelectTriggerClasses = cn(
      uniformInputStyles,
      selectTriggerStyles,
      "w-full cursor-pointer truncate"
    );

    // Memoize disabled states to prevent excessive calculations
    const disabledStates = useMemo(() => {
      const provinceDisabled = !watchedRegion || isLocked;
      const cityDisabled = !watchedProvince || isLocked;
      const barangayDisabled = !watchedCity || isLocked;

      return {
        province: provinceDisabled,
        city: cityDisabled,
        barangay: barangayDisabled,
      };
    }, [watchedRegion, watchedProvince, watchedCity, isLocked]);

    const regionField = (
      <FormField
        control={control}
        name="location.region"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sr-only">Region</FormLabel>
            <Select
              value={field.value?.code || ""}
              onValueChange={(code) => {
                const region = regionList.find((r) => r.code === code) || null;

                // Force reset child fields first to ensure cascading works even with same codes
                setValue("location.province", null, { shouldValidate: false });
                setValue("location.city", null, { shouldValidate: false });
                setValue("location.barangay", null, { shouldValidate: false });

                // Then set the new region
                field.onChange(region);
              }}
              disabled={isLocked}
            >
              <FormControl>
                <SelectTrigger className={commonSelectTriggerClasses}>
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
    );

    const provinceField = (
      <FormField
        control={control}
        name="location.province"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sr-only">Province</FormLabel>
            <Select
              value={field.value?.code || ""}
              onValueChange={(code) => {
                const province = provinceList.find((p) => p.code === code) || null;

                // Force reset child fields first to ensure cascading works even with same codes
                setValue("location.city", null, { shouldValidate: false });
                setValue("location.barangay", null, { shouldValidate: false });

                // Then set the new province
                field.onChange(province);
              }}
              disabled={disabledStates.province}
            >
              <FormControl>
                <SelectTrigger className={commonSelectTriggerClasses}>
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
    );

    const cityField = (
      <FormField
        control={control}
        name="location.city"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sr-only">City/Municipality</FormLabel>
            <Select
              value={field.value?.code || ""}
              onValueChange={(code) => {
                const city = cityList.find((c) => c.code === code) || null;

                // Force reset child fields first to ensure cascading works even with same codes
                setValue("location.barangay", null, { shouldValidate: false });

                // Then set the new city
                field.onChange(city);
              }}
              disabled={disabledStates.city}
            >
              <FormControl>
                <SelectTrigger className={commonSelectTriggerClasses}>
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
    );

    const barangayField = (
      <FormField
        control={control}
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
              disabled={disabledStates.barangay}
            >
              <FormControl>
                <SelectTrigger className={commonSelectTriggerClasses}>
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
    );

    return (
      <FormItem>
        <FormLabel className={sectionTitle}>Location</FormLabel>
        {variant === "stacked" ? (
          <div className={cn("space-y-4", { "cursor-not-allowed": isLocked }, className)}>
            <div className="flex items-start gap-2">
              <div className="flex-grow">{regionField}</div>
              {onToggleLock && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={cn(
                          "h-9 w-9 flex-shrink-0 cursor-pointer border-2 text-slate-400 transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10",
                          {
                            "border-slate-100": isLocked,
                            "border-slate-200": !isLocked,
                          }
                        )}
                        onClick={onToggleLock}
                        aria-label={isLocked ? "Unlock" : "Lock"}
                      >
                        {isLocked ? (
                          <HiOutlineLockClosed className="h-5 w-5" />
                        ) : (
                          <HiOutlineLockOpen className="h-5 w-5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="font-inter">
                      <p>{isLocked ? "Unlock" : "Lock"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {provinceField}
            {cityField}
            {barangayField}
          </div>
        ) : (
          <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", className)}>
            {regionField}
            {provinceField}
            {cityField}
            {barangayField}
          </div>
        )}
      </FormItem>
    );
  }
);

CaseLocationInput.displayName = "CaseLocationInput";
