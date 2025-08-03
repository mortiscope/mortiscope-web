import { format } from "date-fns";
import { memo, useState } from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { PiCalendarCheck, PiClock } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { sectionTitle, uniformInputStyles } from "@/features/cases/constants/styles";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";
import { cn } from "@/lib/utils";

/**
 * A utility function that checks if a given date is the same calendar day as today.
 * @param date - The date to check.
 * @returns True if the date is today, false otherwise.
 */
const isDateToday = (date: Date | undefined): boolean => {
  if (!date) return false;
  const today = new Date();
  // Set hours to 0 on both dates to compare the calendar date only, ignoring time.
  today.setHours(0, 0, 0, 0);
  const comparisonDate = new Date(date);
  comparisonDate.setHours(0, 0, 0, 0);

  return comparisonDate.getTime() === today.getTime();
};

/**
 * Defines the props for the case date input component.
 */
type CaseDateInputProps = {
  /** The `react-hook-form` instance, used for controlling the form field. */
  form: UseFormReturn<CaseDetailsFormInput>;
  /** The layout of the date and time inputs. Defaults to 'horizontal'. */
  layout?: "horizontal" | "vertical";
  /** Whether to show the 'Set to Current Date' switch. Defaults to true. */
  showSwitch?: boolean;
};

/**
 * A memoized component that renders the date and time pickers for the case.
 */
export const CaseDateInput = memo(
  ({ form, layout = "horizontal", showSwitch = true }: CaseDateInputProps) => {
    const { control, setValue, resetField } = form;

    const [isTimeInputFocused, setIsTimeInputFocused] = useState(false);

    const caseDateValue = useWatch({
      control,
      name: "caseDate",
    });

    return (
      <FormField
        control={control}
        name="caseDate"
        render={({ field }) => {
          /**
           * A handler for the calendar popover.
           */
          const handleDateChange = (date: Date | undefined) => {
            if (!date) {
              field.onChange(undefined);
              return;
            }
            const currentDateTime = field.value || new Date(date);
            const newDate = new Date(date);
            newDate.setHours(
              currentDateTime.getHours(),
              currentDateTime.getMinutes(),
              currentDateTime.getSeconds(),
              currentDateTime.getMilliseconds()
            );
            field.onChange(newDate);
          };

          /**
           * A handler for the time input.
           */
          const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const timeValue = e.target.value;
            if (!timeValue) return;

            const [hours, minutes, seconds] = timeValue.split(":").map(Number);
            const currentDate = field.value || new Date();
            const newDate = new Date(currentDate);
            newDate.setHours(hours, minutes, seconds || 0);
            field.onChange(newDate);
          };

          return (
            <FormItem className="flex flex-col">
              <FormLabel className={sectionTitle}>Case Date and Time</FormLabel>
              <div
                className={cn(
                  "flex flex-col gap-4",
                  layout === "horizontal" && "md:flex-row md:gap-2"
                )}
              >
                {/* The date picker */}
                <div className={cn(layout === "horizontal" && "w-full md:w-3/5")}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            uniformInputStyles,
                            "w-full cursor-pointer justify-start overflow-hidden text-left font-normal text-ellipsis whitespace-nowrap",
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
                        onSelect={handleDateChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        autoFocus
                        className="font-inter"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time input */}
                <div
                  className={cn(
                    "relative",
                    layout === "horizontal" ? "w-full md:w-2/5" : "w-full",
                    { "cursor-not-allowed": !field.value }
                  )}
                >
                  <PiClock
                    className={cn(
                      "absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400",
                      { "text-slate-800": !!field.value }
                    )}
                  />
                  <FormControl>
                    <Input
                      type={isTimeInputFocused || field.value ? "time" : "text"}
                      onFocus={() => setIsTimeInputFocused(true)}
                      onBlur={() => setIsTimeInputFocused(false)}
                      step="1"
                      placeholder="Enter a time"
                      className={cn(
                        uniformInputStyles,
                        "overflow-hidden pl-9 text-ellipsis whitespace-nowrap"
                      )}
                      value={field.value ? format(field.value, "HH:mm:ss") : ""}
                      onChange={handleTimeChange}
                      disabled={!field.value}
                    />
                  </FormControl>
                </div>
              </div>

              {showSwitch && (
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="current-date-toggle"
                    className="cursor-pointer data-[state=checked]:bg-emerald-600"
                    checked={isDateToday(caseDateValue)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setValue("caseDate", new Date(), { shouldValidate: true });
                      } else {
                        resetField("caseDate");
                      }
                    }}
                  />
                  <FormLabel
                    htmlFor="current-date-toggle"
                    className="font-inter text-xs font-normal text-slate-500 md:text-sm"
                  >
                    Set to Current Date and Time
                  </FormLabel>
                </div>
              )}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }
);

CaseDateInput.displayName = "CaseDateInput";
