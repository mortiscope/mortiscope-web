import { memo, useEffect, useRef, useState } from "react";
import { type Control, useFormContext, useWatch } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  sectionTitle,
  selectItemStyles,
  selectTriggerStyles,
  uniformInputStyles,
} from "@/features/cases/constants/styles";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";
import { getCoordinates, getHistoricalTemperature } from "@/features/cases/utils/weather-service";
import { cn } from "@/lib/utils";

type CaseTemperatureInputProps = {
  control: Control<CaseDetailsFormInput>;
  /** If true, the inputs will be disabled. Defaults to false. */
  isLocked?: boolean;
  /** Whether to show the 'Set to Historical Temperature' switch. Defaults to true. */
  showSwitch?: boolean;
  /** Optional handler to toggle the lock state. If provided, a lock button is rendered. */
  onToggleLock?: () => void;
};

/**
 * Renders the ambient temperature input with a unit selector (°C/°F).
 */
export const CaseTemperatureInput = memo(
  ({ control, isLocked = false, showSwitch = true, onToggleLock }: CaseTemperatureInputProps) => {
    const { trigger, setValue, resetField } = useFormContext<CaseDetailsFormInput>();
    const temperatureValue = useWatch({ control, name: "temperature.value" });
    const temperatureUnit = useWatch({ control, name: "temperature.unit" });
    const caseDate = useWatch({ control, name: "caseDate" });
    const location = useWatch({ control, name: "location" });

    const [isLoading, setIsLoading] = useState(false);
    const [isHistorical, setIsHistorical] = useState(false);

    // Store the date/location values when the switch was turned on
    const snapshotRef = useRef<{ date: number; location: string } | null>(null);

    useEffect(() => {
      if (temperatureValue != null && String(temperatureValue).trim() !== "" && temperatureUnit) {
        trigger("temperature.value");
      }
    }, [temperatureValue, temperatureUnit, trigger]);

    // Auto-reset when dependencies change if the switch is on
    useEffect(() => {
      if (isHistorical && snapshotRef.current) {
        const currentDate = caseDate?.getTime();
        const currentLocation = JSON.stringify(location);

        // Check if values have actually changed from the snapshot
        if (
          currentDate !== snapshotRef.current.date ||
          currentLocation !== snapshotRef.current.location
        ) {
          setIsHistorical(false);
          resetField("temperature.value");
          resetField("temperature.unit");
          snapshotRef.current = null;
        }
      }
    }, [caseDate, location, isHistorical, resetField]);

    return (
      <FormField
        control={control}
        name="temperature.value"
        render={({ field: { value, ...rest } }) => {
          const isUnitDisabled = value == null || String(value).trim() === "";

          return (
            <FormItem>
              <FormLabel className={sectionTitle}>Ambient Temperature</FormLabel>
              <div className="flex items-start gap-2">
                <div
                  className={cn("flex flex-grow items-start gap-2", {
                    "cursor-not-allowed": isLocked,
                  })}
                >
                  <div className="flex-grow">
                    <FormControl>
                      <Input
                        placeholder="Enter ambient temperature"
                        type="text"
                        inputMode="decimal"
                        {...rest}
                        value={String(value ?? "")}
                        className={cn(
                          uniformInputStyles,
                          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        )}
                        disabled={isLocked}
                      />
                    </FormControl>
                  </div>
                  <div className={cn({ "cursor-not-allowed": isUnitDisabled })}>
                    <FormField
                      control={control}
                      name="temperature.unit"
                      render={({ field: unitField }) => (
                        <FormItem>
                          <FormLabel className="sr-only">Temperature Unit</FormLabel>
                          <Select onValueChange={unitField.onChange} value={unitField.value}>
                            <FormControl>
                              <SelectTrigger
                                disabled={isUnitDisabled || isLocked}
                                className={cn(
                                  uniformInputStyles,
                                  selectTriggerStyles,
                                  "w-[90px]",
                                  !isUnitDisabled && !isLocked && "cursor-pointer"
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

              {showSwitch && (
                <div
                  className={cn("flex items-center space-x-2 pt-2", {
                    "cursor-not-allowed": !caseDate || !location?.city || isLocked,
                  })}
                >
                  <Switch
                    id="historical-temp-toggle"
                    className="cursor-pointer data-[state=checked]:bg-emerald-600"
                    checked={isHistorical}
                    onCheckedChange={async (checked) => {
                      setIsHistorical(checked);
                      if (checked) {
                        if (!caseDate || !location?.city?.name) return;

                        // Capture snapshot
                        snapshotRef.current = {
                          date: caseDate.getTime(),
                          location: JSON.stringify(location),
                        };

                        setIsLoading(true);
                        try {
                          const coords = await getCoordinates(location.city.name);
                          const weather = await getHistoricalTemperature(
                            coords.lat,
                            coords.long,
                            caseDate
                          );

                          setValue("temperature.value", weather.value, { shouldValidate: true });
                          setValue("temperature.unit", weather.unit, { shouldValidate: true });
                        } catch {
                          // Silently fail and turn off switch
                          setIsHistorical(false);
                          snapshotRef.current = null;
                        } finally {
                          setIsLoading(false);
                        }
                      } else {
                        resetField("temperature.value");
                        resetField("temperature.unit");
                        snapshotRef.current = null;
                      }
                    }}
                    disabled={!caseDate || !location?.city || isLocked || isLoading}
                  />
                  <FormLabel
                    htmlFor="historical-temp-toggle"
                    className={cn("font-inter text-xs font-normal text-slate-500 md:text-sm", {
                      "text-slate-400": !caseDate || !location?.city || isLocked,
                    })}
                  >
                    Set Temperature Based on Date
                  </FormLabel>
                </div>
              )}
            </FormItem>
          );
        }}
      />
    );
  }
);

CaseTemperatureInput.displayName = "CaseTemperatureInput";
