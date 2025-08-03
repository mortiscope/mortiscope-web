import { memo, useEffect } from "react";
import { type Control, useFormContext, useWatch } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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

type CaseTemperatureInputProps = {
  control: Control<CaseDetailsFormInput>;
  /** If true, the inputs will be disabled. Defaults to false. */
  isLocked?: boolean;
  /** Optional handler to toggle the lock state. If provided, a lock button is rendered. */
  onToggleLock?: () => void;
};

/**
 * Renders the ambient temperature input with a unit selector (°C/°F).
 */
export const CaseTemperatureInput = memo(
  ({ control, isLocked = false, onToggleLock }: CaseTemperatureInputProps) => {
    const { trigger } = useFormContext<CaseDetailsFormInput>();
    const temperatureValue = useWatch({ control, name: "temperature.value" });
    const temperatureUnit = useWatch({ control, name: "temperature.unit" });

    useEffect(() => {
      if (temperatureValue != null && String(temperatureValue).trim() !== "" && temperatureUnit) {
        trigger("temperature.value");
      }
    }, [temperatureValue, temperatureUnit, trigger]);

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
                                className={cn(uniformInputStyles, selectTriggerStyles, "w-[90px]")}
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
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }
);

CaseTemperatureInput.displayName = "CaseTemperatureInput";
