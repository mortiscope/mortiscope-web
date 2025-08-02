import { memo, useEffect } from "react";
import { type Control, useFormContext, useWatch } from "react-hook-form";

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
};

/**
 * Renders the ambient temperature input with a unit selector (°C/°F).
 */
export const CaseTemperatureInput = memo(({ control }: CaseTemperatureInputProps) => {
  const { trigger } = useFormContext<CaseDetailsFormInput>();

  // Watch both temperature value and unit for reactive validation
  const temperatureValue = useWatch({ control, name: "temperature.value" });
  const temperatureUnit = useWatch({ control, name: "temperature.unit" });

  // Trigger validation whenever either value or unit changes
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
        // The unit selector should be disabled if no temperature value has been entered.
        const isUnitDisabled = value == null || String(value).trim() === "";

        return (
          <FormItem>
            <FormLabel className={sectionTitle}>Ambient Temperature</FormLabel>
            <div className="flex items-start gap-2">
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
                  />
                </FormControl>
              </div>
              {/* Field for the temperature unit selector (°C/°F). */}
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
                            disabled={isUnitDisabled}
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
        );
      }}
    />
  );
});

CaseTemperatureInput.displayName = "CaseTemperatureInput";
