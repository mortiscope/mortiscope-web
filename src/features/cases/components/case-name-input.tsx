import { memo } from "react";
import { type Control } from "react-hook-form";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { sectionTitle, uniformInputStyles } from "@/features/cases/constants/styles";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";
import { cn } from "@/lib/utils";

type CaseNameInputProps = {
  control: Control<CaseDetailsFormInput>;
  /** If true, the input will be disabled. Defaults to false. */
  isLocked?: boolean;
  /** Optional handler to toggle the lock state. If provided, a lock button is rendered. */
  onToggleLock?: () => void;
};

/**
 * Renders the input field for the case name.
 */
export const CaseNameInput = memo(
  ({ control, isLocked = false, onToggleLock }: CaseNameInputProps) => {
    return (
      <FormField
        control={control}
        name="caseName"
        render={({ field }) => (
          <FormItem>
            <FormLabel className={sectionTitle}>Case Name</FormLabel>
            <div className="flex items-start gap-2">
              <div className={cn("flex-grow", { "cursor-not-allowed": isLocked })}>
                <FormControl>
                  <Input
                    placeholder="Enter case name"
                    {...field}
                    value={field.value ?? ""}
                    className={cn(uniformInputStyles, "w-full")}
                    disabled={isLocked}
                  />
                </FormControl>
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
        )}
      />
    );
  }
);

CaseNameInput.displayName = "CaseNameInput";
