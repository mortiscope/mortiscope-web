import { memo } from "react";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { LuLoaderCircle } from "react-icons/lu";
import { PiFloppyDiskBack } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { sectionTitle, uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the profile field component.
 */
type ProfileFieldProps = {
  /** The label text displayed above the input field. */
  label: string;
  /** The placeholder text for the input field. */
  placeholder: string;
  /** The current value of the input, making it a controlled component. */
  value: string;
  /** A callback function to handle changes to the input's value. */
  onChange: (value: string) => void;
  /** A boolean indicating if the field is currently in a locked (read-only) state. */
  isLocked: boolean;
  /** A callback function to toggle the locked state of the field. */
  onToggleLock: () => void;
  /** A callback function to trigger the save action for this field. */
  onSave: () => void;
  /** A boolean to enable or disable the save button, typically based on whether changes have been made. */
  isSaveEnabled: boolean;
  /** A boolean indicating if the save operation is in a pending state, which shows a spinner. */
  isPending: boolean;
  /** An optional boolean to completely disable the entire component. */
  isDisabled?: boolean;
  /** A boolean to show or hide the lock and save controls. */
  showLockControls?: boolean;
};

/**
 * A memoized, reusable component that renders an input field for a user profile. It encapsulates
 * the common interface pattern of having a field that can be unlocked for editing and then saved.
 */
export const ProfileField = memo(
  ({
    label,
    placeholder,
    value,
    onChange,
    isLocked,
    onToggleLock,
    onSave,
    isSaveEnabled,
    isPending,
    isDisabled = false,
    showLockControls = true,
  }: ProfileFieldProps) => (
    <div className="w-full">
      <Label className={`${sectionTitle} font-inter`}>{label}</Label>
      <div className="mt-2 flex items-start gap-2">
        {/* The main input field. */}
        <div
          className={cn("flex-grow", {
            "cursor-not-allowed": isDisabled || isLocked,
          })}
        >
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(uniformInputStyles, "w-full shadow-none", {
              "border-slate-200 disabled:opacity-100": isDisabled || isLocked,
            })}
            disabled={isDisabled || isLocked}
          />
        </div>
        {/* Conditionally renders the lock and save action buttons. */}
        {showLockControls && (
          <div className="flex gap-2">
            {/* The Lock/Unlock Button */}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-9 w-9 flex-shrink-0 cursor-pointer border-2 text-slate-400 shadow-none transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10 md:w-10",
                      "border-slate-200 disabled:opacity-100"
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
            {/* The Save Button */}
            <div className={cn({ "cursor-not-allowed": !isSaveEnabled })}>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-9 w-9 flex-shrink-0 border-2 text-slate-400 shadow-none transition-colors ease-in-out disabled:opacity-100 md:h-10 md:w-10",
                        isSaveEnabled
                          ? "cursor-pointer border-slate-200 hover:border-green-600 hover:bg-green-100 hover:text-green-600"
                          : "cursor-not-allowed border-slate-200"
                      )}
                      disabled={!isSaveEnabled}
                      onClick={onSave}
                      aria-label="Save"
                    >
                      {/* Shows a spinner during the save operation, otherwise a disk icon. */}
                      {isPending ? (
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
          </div>
        )}
      </div>
    </div>
  )
);

ProfileField.displayName = "ProfileField";
