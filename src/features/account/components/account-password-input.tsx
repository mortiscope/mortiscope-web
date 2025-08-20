import { forwardRef, useState } from "react";
import { PiEye, PiEyeSlash } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uniformInputStyles } from "@/features/cases/constants/styles";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the account password input component.
 */
type AccountPasswordInputProps = {
  /** The placeholder text for the input field. */
  placeholder?: string;
  /** A boolean to disable the input and toggle button. */
  disabled?: boolean;
  /** An optional class name for custom styling of the input element. */
  className?: string;
  /** The autocomplete attribute for the input, defaulting to a common value for password fields. */
  autoComplete?: string;
  /** The color variant for the focus ring, used to match the context of the form. */
  focusColor?: "rose" | "emerald" | "slate";
  /** A boolean to apply error-specific styling to the input border. */
  hasError?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * A reusable, controlled password input component that features a visibility toggle,
 * support for validation error states, and customizable focus colors.
 */
export const AccountPasswordInput = forwardRef<HTMLInputElement, AccountPasswordInputProps>(
  (
    {
      placeholder = "Enter your password",
      disabled = false,
      className,
      autoComplete = "current-password",
      focusColor = "rose",
      hasError = false,
      ...props
    },
    ref
  ) => {
    /** A local state to manage the visibility of the password's characters. */
    const [showPassword, setShowPassword] = useState(false);

    /** A simple handler to toggle the password's visibility state. */
    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    /**
     * A helper function that returns the appropriate Tailwind CSS classes for the
     * input's focus state based on the `focusColor` prop.
     */
    const getFocusColorClasses = () => {
      switch (focusColor) {
        case "emerald":
          return "focus-visible:!border-emerald-600 data-[state=open]:!border-emerald-600";
        case "slate":
          return "focus-visible:!border-slate-600 data-[state=open]:!border-slate-600";
        case "rose":
        default:
          return "focus-visible:!border-rose-600 data-[state=open]:!border-rose-600";
      }
    };

    return (
      // The main container for the input and its absolutely positioned toggle button.
      <div className="relative">
        <Input
          ref={ref}
          // The input `type` is dynamically changed to show or hide the password.
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          // Applies a combination of base, focus, error, and custom styles.
          className={cn(
            uniformInputStyles,
            "w-full pr-10 shadow-none",
            getFocusColorClasses(),
            hasError && "border-red-500 focus-visible:!border-red-500",
            className
          )}
          {...props}
        />
        {/* The button to toggle password visibility. */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={togglePasswordVisibility}
          disabled={disabled}
          className="absolute top-1/2 right-2 h-7 w-7 -translate-y-1/2 cursor-pointer text-slate-500 hover:bg-transparent hover:text-slate-700"
          aria-label={showPassword ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {/* Conditionally renders the appropriate eye icon based on the visibility state. */}
          {showPassword ? (
            <PiEye size={18} className="h-5 w-5" />
          ) : (
            <PiEyeSlash size={18} className="h-5 w-5" />
          )}
        </Button>
      </div>
    );
  }
);

AccountPasswordInput.displayName = "AccountPasswordInput";
