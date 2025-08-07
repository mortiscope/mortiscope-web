"use client";

import { useState } from "react";
import { PiEye, PiEyeSlash } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the PDF password input component.
 */
interface PdfPasswordInputProps {
  /** The current value of the password input, making it a controlled component. */
  value: string;
  /** A callback function to handle changes to the input's value. */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** A boolean to disable the input and the toggle button. */
  disabled: boolean;
  /** An optional placeholder text for the input field. */
  placeholder?: string;
  /** An optional boolean to apply error styling to the input. */
  hasError?: boolean;
  /** An optional error message to display below the input when `hasError` is true. */
  errorMessage?: string;
}

/**
 * A reusable, controlled password input component that features a visibility toggle
 * and support for displaying validation errors. It is designed to be easily
 * integrated into forms.
 *
 * @param {PdfPasswordInputProps} props The props for the component.
 * @returns A React component representing the password input field.
 */
export const PdfPasswordInput = ({
  value,
  onChange,
  disabled,
  placeholder = "Enter password",
  hasError = false,
  errorMessage,
}: PdfPasswordInputProps) => {
  // State to manage the visibility of the password's characters.
  const [isVisible, setIsVisible] = useState(false);

  /** A simple handler to toggle the password's visibility state. */
  const toggleVisibility = () => setIsVisible(!isVisible);

  return (
    <div className="space-y-1">
      {/* The main container for the input and its visibility toggle button. */}
      <div className="relative">
        <Input
          // The input `type` is dynamically changed to show or hide the password.
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          // Applies conditional styling for the error state.
          className={cn(
            "font-inter h-9 border-2 pr-10 text-sm placeholder:text-slate-400 focus-visible:ring-0 md:h-10",
            hasError
              ? "border-rose-500 focus-visible:border-rose-500"
              : "border-slate-200 focus-visible:border-green-600"
          )}
          autoComplete="new-password"
        />
        {/* The button to toggle password visibility, absolutely positioned inside the input container. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleVisibility}
          disabled={disabled}
          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 cursor-pointer text-slate-500 hover:bg-transparent hover:text-slate-700 md:right-2"
          aria-label={isVisible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {/* Conditionally renders the appropriate icon based on the visibility state. */}
          {isVisible ? (
            <PiEye size={18} className="md:h-5 md:w-5" />
          ) : (
            <PiEyeSlash size={18} className="md:h-5 md:w-5" />
          )}
        </Button>
      </div>
      {/* Conditionally renders the error message below the input. */}
      {hasError && errorMessage && (
        <p className="font-inter text-xs text-rose-600">{errorMessage}</p>
      )}
    </div>
  );
};

PdfPasswordInput.displayName = "PdfPasswordInput";
