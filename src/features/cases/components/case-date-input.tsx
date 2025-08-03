import { format } from "date-fns";
import { memo, useState } from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { PiCalendarCheck, PiClock } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  variant?: "horizontal" | "stacked";
  /** Whether to show the 'Set to Current Date' switch. Defaults to true. */
  showSwitch?: boolean;
  /** If true, the inputs will be disabled. Defaults to false. */
  isLocked?: boolean;
  /** Optional handler to toggle the lock state. If provided, a lock button is rendered. */
  onToggleLock?: () => void;
};

/**
 * A memoized component that renders the date and time pickers for the case.
 */
export const CaseDateInput = memo(
  ({
    form,
    variant = "horizontal",
    showSwitch = true,
    isLocked = false,
    onToggleLock,
  }: CaseDateInputProps) => {
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

          const datePicker = (
            <Popover>
              <PopoverTrigger asChild disabled={isLocked}>
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
          );

          const timePicker = (
            <div
              className={cn("relative", {
                "cursor-not-allowed": !field.value || isLocked,
              })}
            >
              <PiClock
                className={cn("absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400", {
                  "text-slate-800": !!field.value,
                })}
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
                    "w-full overflow-hidden pl-9 text-ellipsis whitespace-nowrap"
                  )}
                  value={field.value ? format(field.value, "HH:mm:ss") : ""}
                  onChange={handleTimeChange}
                  disabled={!field.value || isLocked}
                />
              </FormControl>
            </div>
          );

          return (
            <FormItem className="flex flex-col">
              <FormLabel className={sectionTitle}>Case Date and Time</FormLabel>
              {variant === "stacked" ? (
                <div className={cn("space-y-4", { "cursor-not-allowed": isLocked })}>
                  <div className="flex items-start gap-2">
                    <div className="flex-grow">{datePicker}</div>

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
                  {timePicker}
                </div>
              ) : (
                <div className="flex flex-col gap-4 md:flex-row md:gap-2">
                  <div className="w-full md:w-3/5">{datePicker}</div>
                  <div className="w-full md:w-2/5">{timePicker}</div>
                </div>
              )}

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
                    disabled={isLocked}
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
