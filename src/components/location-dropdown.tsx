import { useMemo } from "react";
import { type Control, type FieldPath, type FieldValues, useController } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { LuLoaderCircle } from "react-icons/lu";
import { PiFloppyDiskBack } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { cn } from "@/lib/utils";

/**
 * Defines the basic structure for an address part.
 */
type AddressPart = { code: string; name: string };

/**
 * Defines the props for the generic location dropdown component.
 * @template T The type of the form values, extending `react-hook-form`'s `FieldValues`.
 */
interface LocationDropdownProps<T extends FieldValues = FieldValues> {
  /** Form control from react-hook-form */
  control: Control<T>;
  /** Base field path for location (e.g., "location" or "address") */
  basePath: string;
  /** List of regions */
  regionList: AddressPart[];
  /** List of provinces */
  provinceList: AddressPart[];
  /** List of cities */
  cityList: AddressPart[];
  /** List of barangays */
  barangayList: AddressPart[];
  /** Layout variant */
  variant?: "grid" | "stacked";
  /** Whether the component is locked */
  isLocked?: boolean;
  /** A boolean to enable or disable the lock toggle button. */
  isLockEnabled?: boolean;
  /** An optional callback function to toggle the locked state. */
  onToggleLock?: () => void;
  /** Save handler for region field */
  onSaveRegion?: () => void;
  /** A boolean to enable or disable the save button. */
  isSaveEnabled?: boolean;
  /** A boolean to indicate if the save operation is in a pending state. */
  isSavePending?: boolean;
  /** An optional class name for custom styling of the container. */
  className?: string;
  /** Show label */
  showLabel?: boolean;
  /** Custom label text */
  labelText?: string;
  /** Custom input styles */
  inputStyles?: string;
  /** Custom label styles */
  labelStyles?: string;
  /** Custom select item styles */
  customSelectItemStyles?: string;
  /** Custom select trigger styles */
  customSelectTriggerStyles?: string;
}

/**
 * A reusable location dropdown component with cascading Philippine address selection.
 * Supports both form integration and standalone usage with customizable validation.
 */
export function LocationDropdown<T extends FieldValues = FieldValues>({
  control,
  basePath,
  regionList,
  provinceList,
  cityList,
  barangayList,
  variant = "grid",
  isLocked = false,
  isLockEnabled = true,
  onToggleLock,
  onSaveRegion,
  isSaveEnabled = false,
  isSavePending = false,
  className,
  showLabel = true,
  labelText = "Location",
  inputStyles = uniformInputStyles,
  labelStyles = sectionTitle,
  customSelectItemStyles = selectItemStyles,
  customSelectTriggerStyles = selectTriggerStyles,
}: LocationDropdownProps<T>) {
  // Field controllers for each dropdown
  const regionField = useController({
    control,
    name: `${basePath}.region` as FieldPath<T>,
  });

  const provinceField = useController({
    control,
    name: `${basePath}.province` as FieldPath<T>,
  });

  const cityField = useController({
    control,
    name: `${basePath}.city` as FieldPath<T>,
  });

  const barangayField = useController({
    control,
    name: `${basePath}.barangay` as FieldPath<T>,
  });

  // Watch values for cascading logic
  const watchedRegion = regionField.field.value;
  const watchedProvince = provinceField.field.value;
  const watchedCity = cityField.field.value;

  // A shared class string for consistent styling of the select triggers.
  const commonSelectTriggerClasses = cn(
    inputStyles,
    customSelectTriggerStyles,
    "w-full cursor-pointer truncate"
  );

  /**
   * Memoizes the disabled states of the dependent dropdowns for performance optimization.
   * This prevents recalculating these states on every render.
   */
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

  /**
   * A helper function that implements the cascading logic. When a parent dropdown changes,
   * this function is called to reset the values of all its child dropdowns, ensuring data consistency.
   *
   * @param level The level from which to start resetting.
   */
  const resetChildFields = (level: "province" | "city" | "barangay") => {
    // When region changes, reset province, city, and barangay
    if (level === "province") {
      provinceField.field.onChange(null);
      cityField.field.onChange(null);
      barangayField.field.onChange(null);
    }

    // When province changes, reset city and barangay only
    if (level === "city") {
      cityField.field.onChange(null);
      barangayField.field.onChange(null);
    }

    // When city changes, reset barangay only
    if (level === "barangay") {
      barangayField.field.onChange(null);
    }
  };

  // Defining each dropdown as a separate JSX variable for improved readability.
  const regionDropdown = (
    <FormItem>
      <FormLabel className="sr-only">Region</FormLabel>
      <Select
        value={regionField.field.value?.code || ""}
        onValueChange={(code) => {
          const region = regionList.find((r) => r.code === code) || null;

          // Reset child fields first
          resetChildFields("province");

          // Then set the new region
          regionField.field.onChange(region);
        }}
        disabled={isLocked}
      >
        <FormControl>
          <SelectTrigger className={cn(commonSelectTriggerClasses, "rounded-lg")}>
            <SelectValue placeholder="Select Region" />
          </SelectTrigger>
        </FormControl>
        <SelectContent className="max-h-72 overflow-x-auto rounded-lg border-2 border-slate-200 shadow-none">
          {regionList.map((r) => (
            <SelectItem
              key={r.code}
              value={r.code}
              className={cn(customSelectItemStyles, "rounded-md")}
            >
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );

  const provinceDropdown = (
    <FormItem>
      <FormLabel className="sr-only">Province</FormLabel>
      <Select
        value={provinceField.field.value?.code || ""}
        onValueChange={(code) => {
          const province = provinceList.find((p) => p.code === code) || null;

          // Reset child fields first
          resetChildFields("city");

          // Then set the new province
          provinceField.field.onChange(province);
        }}
        disabled={disabledStates.province}
      >
        <FormControl>
          <SelectTrigger className={cn(commonSelectTriggerClasses, "rounded-lg")}>
            <SelectValue placeholder="Select Province" />
          </SelectTrigger>
        </FormControl>
        <SelectContent className="max-h-72 overflow-x-auto rounded-lg border-2 border-slate-200 shadow-none">
          {provinceList.map((p) => (
            <SelectItem
              key={p.code}
              value={p.code}
              className={cn(customSelectItemStyles, "rounded-md")}
            >
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );

  const cityDropdown = (
    <FormItem>
      <FormLabel className="sr-only">City/Municipality</FormLabel>
      <Select
        value={cityField.field.value?.code || ""}
        onValueChange={(code) => {
          const city = cityList.find((c) => c.code === code) || null;

          // Reset child fields first
          resetChildFields("barangay");

          // Then set the new city
          cityField.field.onChange(city);
        }}
        disabled={disabledStates.city}
      >
        <FormControl>
          <SelectTrigger className={cn(commonSelectTriggerClasses, "rounded-lg")}>
            <SelectValue placeholder="Select City/Municipality" />
          </SelectTrigger>
        </FormControl>
        <SelectContent className="max-h-72 overflow-x-auto rounded-lg border-2 border-slate-200 shadow-none">
          {cityList.map((c) => (
            <SelectItem
              key={c.code}
              value={c.code}
              className={cn(customSelectItemStyles, "rounded-md")}
            >
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );

  const barangayDropdown = (
    <FormItem>
      <FormLabel className="sr-only">Barangay</FormLabel>
      <Select
        value={barangayField.field.value?.code || ""}
        onValueChange={(code) => {
          const barangay = barangayList.find((b) => b.code === code) || null;
          barangayField.field.onChange(barangay);
        }}
        disabled={disabledStates.barangay}
      >
        <FormControl>
          <SelectTrigger className={cn(commonSelectTriggerClasses, "rounded-lg")}>
            <SelectValue placeholder="Select Barangay" />
          </SelectTrigger>
        </FormControl>
        <SelectContent className="max-h-72 overflow-x-auto rounded-lg border-2 border-slate-200 shadow-none">
          {barangayList.map((b) => (
            <SelectItem
              key={b.code}
              value={b.code}
              className={cn(customSelectItemStyles, "rounded-md")}
            >
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );

  return (
    <FormItem>
      {showLabel && <FormLabel className={labelStyles}>{labelText}</FormLabel>}
      {/* Renders the final layout based on the `variant` prop. */}
      {variant === "stacked" ? (
        <div className={cn("space-y-4", { "cursor-not-allowed": isLocked }, className)}>
          <div className="flex items-start gap-2">
            <div className="flex-grow">{regionDropdown}</div>
            {/* Renders the lock button if its handler is provided. */}
            {onToggleLock && (
              <div className={cn({ "cursor-not-allowed": !isLockEnabled })}>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={cn(
                          "h-9 w-9 flex-shrink-0 border-2 text-slate-400 transition-colors ease-in-out md:h-10 md:w-10",
                          isLockEnabled
                            ? "cursor-pointer hover:border-green-600 hover:bg-green-100 hover:text-green-600"
                            : "cursor-not-allowed opacity-50",
                          {
                            "border-slate-100": isLocked,
                            "border-slate-200": !isLocked,
                          }
                        )}
                        disabled={!isLockEnabled}
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
              </div>
            )}
          </div>
          {provinceDropdown}
          {cityDropdown}
          {barangayDropdown}
        </div>
      ) : (
        <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", className)}>
          {/* Conditionally renders the region dropdown with or without action buttons. */}
          {onToggleLock || onSaveRegion ? (
            <div className="flex items-start gap-2">
              <div className="flex-grow">{regionDropdown}</div>
              <div className="flex gap-2">
                {onToggleLock && (
                  <div className={cn({ "cursor-not-allowed": !isLockEnabled })}>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn(
                              "h-9 w-9 flex-shrink-0 border-2 text-slate-400 transition-colors ease-in-out md:h-10 md:w-10",
                              isLockEnabled
                                ? "cursor-pointer hover:border-green-600 hover:bg-green-100 hover:text-green-600"
                                : "cursor-not-allowed opacity-50",
                              {
                                "border-slate-100": isLocked,
                                "border-slate-200": !isLocked,
                              }
                            )}
                            disabled={!isLockEnabled}
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
                  </div>
                )}
                {onSaveRegion && (
                  <div className={cn({ "cursor-not-allowed": !isSaveEnabled })}>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={cn(
                              "h-9 w-9 flex-shrink-0 border-2 text-slate-400 transition-colors ease-in-out md:h-10 md:w-10",
                              isSaveEnabled
                                ? "cursor-pointer border-slate-200 hover:border-green-600 hover:bg-green-100 hover:text-green-600"
                                : "cursor-not-allowed border-slate-100 opacity-50"
                            )}
                            disabled={!isSaveEnabled}
                            onClick={onSaveRegion}
                            aria-label="Save"
                          >
                            {isSavePending ? (
                              <LuLoaderCircle className="h-5 w-5 animate-spin" />
                            ) : (
                              <PiFloppyDiskBack className="h-5 w-5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="font-inter">
                          <p>Save</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            </div>
          ) : (
            regionDropdown
          )}
          {provinceDropdown}
          {cityDropdown}
          {barangayDropdown}
        </div>
      )}
    </FormItem>
  );
}

LocationDropdown.displayName = "LocationDropdown";
