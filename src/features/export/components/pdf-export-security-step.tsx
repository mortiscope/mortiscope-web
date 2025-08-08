"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PdfPasswordInput } from "@/features/export/components/pdf-password-input";
import {
  type PageSize,
  type SecurityLevel,
  securityOptions,
} from "@/features/export/constants/pdf-options";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the PDF export security step component.
 */
interface PdfExportSecurityStepProps {
  /** The currently selected security level. */
  securityLevel: SecurityLevel;
  /** A callback function to update the selected security level. */
  onSecurityLevelChange: (value: SecurityLevel) => void;
  /** The currently selected page size. */
  pageSize: PageSize;
  /** A callback function to update the selected page size. */
  onPageSizeChange: (value: NonNullable<PageSize>) => void;
  /** The current value of the password input. */
  password: string;
  /** A callback function to update the password state. */
  onPasswordChange: (value: string) => void;
  /** A boolean to indicate if an action is pending, which disables the inputs. */
  isPending: boolean;
}

/**
 * Renders the interface for the security step of the PDF export wizard. This component
 * allows the user to select a security level, page size, and password for the PDF document.
 * It is a fully controlled component, with its state managed by a parent hook.
 */
export const PdfExportSecurityStep = ({
  securityLevel,
  onSecurityLevelChange,
  pageSize,
  onPageSizeChange,
  password,
  onPasswordChange,
  isPending,
}: PdfExportSecurityStepProps) => {
  // A derived boolean to control the disabled state of the page size select.
  const isPageSizeDisabled = !securityLevel || isPending;

  // Check if password protection should be enabled
  const isPasswordRequired =
    securityLevel === "view_protected" || securityLevel === "permissions_protected";
  const isPasswordDisabled = !isPasswordRequired || isPending;

  // Password validation
  const hasPasswordError = password.length > 0 && password.length < 8;
  const passwordErrorMessage = hasPasswordError
    ? "Password must be at least 8 characters."
    : undefined;

  return (
    <div className="space-y-4">
      {/* Security Level Selection */}
      <div className={cn(isPending && "pointer-events-none opacity-50")}>
        <Label className="font-inter pl-1 text-sm font-normal text-slate-700">
          Configure the security level for the PDF document.
        </Label>
        <RadioGroup
          value={securityLevel ?? ""}
          onValueChange={(value) => onSecurityLevelChange(value as NonNullable<SecurityLevel>)}
          className="mt-2 gap-1.5 space-y-2"
        >
          {/* Dynamically generates the radio options by mapping over the security options constant. */}
          {securityOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Label
                key={option.value}
                htmlFor={option.value}
                className={cn(
                  "flex items-start rounded-2xl border-2 p-4 text-left transition-colors duration-300",
                  isPending ? "cursor-not-allowed" : "cursor-pointer",
                  // Applies distinct styling for the selected option.
                  securityLevel === option.value
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                )}
              >
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  disabled={isPending}
                  className={cn(
                    "mt-1 mr-3 shrink-0",
                    "focus-visible:ring-emerald-500/50",
                    securityLevel === option.value &&
                      "border-emerald-600 text-emerald-600 [&_svg]:fill-emerald-600"
                  )}
                />
                <div className="flex-1">
                  <div className="font-inter flex items-center font-medium text-slate-800">
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{option.label}</span>
                  </div>
                  <p className="font-inter mt-1.5 text-sm font-normal text-slate-600">
                    {option.description}
                  </p>
                </div>
              </Label>
            );
          })}
        </RadioGroup>
      </div>

      {/* Page Size Selection */}
      <div className={cn(isPageSizeDisabled && "cursor-not-allowed")}>
        <Label
          htmlFor="page-size"
          className={cn(
            "font-inter pl-1 text-sm font-normal text-slate-700",
            isPageSizeDisabled && "opacity-50"
          )}
        >
          Set the page size for the PDF document.
        </Label>
        <Select
          value={pageSize || ""}
          onValueChange={(value) => onPageSizeChange(value as NonNullable<PageSize>)}
          disabled={isPageSizeDisabled}
        >
          <SelectTrigger
            id="page-size"
            className={cn(
              "font-inter mt-2 h-10 w-full border-2 border-slate-200 bg-white text-sm shadow-none transition-colors duration-300 ease-in-out placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-emerald-400 data-[state=open]:bg-emerald-50",
              !isPageSizeDisabled && "cursor-pointer hover:border-emerald-400 hover:bg-emerald-50",
              // Styles the placeholder text when no value is selected.
              "data-[placeholder]:text-slate-400"
            )}
          >
            <SelectValue placeholder="Select Page Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              value="a4"
              className="font-inter cursor-pointer border-2 border-transparent text-sm transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:bg-emerald-100 hover:text-emerald-600 focus:border-emerald-200 focus:bg-emerald-100 focus:text-emerald-600"
            >
              A4 (21 cm x 29.7 cm)
            </SelectItem>
            <SelectItem
              value="letter"
              className="font-inter cursor-pointer border-2 border-transparent text-sm transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:bg-emerald-100 hover:text-emerald-600 focus:border-emerald-200 focus:bg-emerald-100 focus:text-emerald-600"
            >
              Letter (21.59 cm x 27.94 cm)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Password Protection Section */}
      <div className={cn(isPasswordDisabled && "cursor-not-allowed")}>
        <Label
          className={cn(
            "font-inter pl-1 text-sm font-normal text-slate-700",
            isPasswordDisabled && "opacity-50"
          )}
        >
          Enter a password to protect access to this document.
        </Label>
        <div className={cn("mt-2", isPasswordDisabled && "pointer-events-none opacity-50")}>
          <PdfPasswordInput
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            disabled={isPasswordDisabled}
            placeholder="Enter password"
            hasError={hasPasswordError && isPasswordRequired}
            errorMessage={passwordErrorMessage}
          />
        </div>
      </div>
    </div>
  );
};

PdfExportSecurityStep.displayName = "PdfExportSecurityStep";
