import { format } from "date-fns";
import { memo } from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { PiCalendarCheck } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { sectionTitle, uniformInputStyles } from "@/features/cases/constants/styles";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";
import { cn } from "@/lib/utils";

/**
 * Checks if a given date is today.
 * @param date - The date to check.
 * @returns True if the date is today, false otherwise.
 */
const isDateToday = (date: Date | undefined): boolean => {
  if (!date) return false;
  const today = new Date();
  // Set hours to 0 to compare dates only, ignoring time
  today.setHours(0, 0, 0, 0);
  const comparisonDate = new Date(date);
  comparisonDate.setHours(0, 0, 0, 0);

  return comparisonDate.getTime() === today.getTime();
};

type CaseDateInputProps = {
  form: UseFormReturn<CaseDetailsFormInput>;
};

/**
 * Renders the date picker for the case date, including a switch to set the date to today.
 */
export const CaseDateInput = memo(({ form }: CaseDateInputProps) => {
  const { control, setValue, resetField } = form;

  // Hook to subscribe the component to changes in the case date field.
  const caseDateValue = useWatch({
    control,
    name: "caseDate",
  });

  return (
    <FormField
      control={control}
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
                  setValue("caseDate", new Date(), { shouldValidate: true });
                } else {
                  // If the user un-checks, we reset the field to its default value (likely undefined)
                  resetField("caseDate");
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
  );
});

CaseDateInput.displayName = "CaseDateInput";
