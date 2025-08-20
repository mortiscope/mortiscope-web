import { useState } from "react";
import { type ControllerRenderProps, type FieldPath, type FieldValues } from "react-hook-form";
import { PiEye, PiEyeSlash } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

/**
 * Defines the props for the authentication password input component.
 * It uses generics to maintain type safety with `react-hook-form`.
 *
 * @template TFieldValues The type of the form's values.
 * @template TName The specific name of the field this input is for.
 */
interface AuthPasswordInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  /** The `field` object provided by the `render` prop of `react-hook-form`'s `Controller` or `FormField`. */
  field: ControllerRenderProps<TFieldValues, TName>;
  /** The text to be displayed in the form label. */
  label: string;
  /** The placeholder text for the input field. */
  placeholder: string;
  /** An optional boolean to disable the input and toggle button. @default false */
  disabled?: boolean;
  /** An optional ID for the input, used to link the label for accessibility. */
  id?: string;
}

/**
 * A reusable password input component with a visibility toggle, designed to be used
 * within a `react-hook-form`'s `FormField` or `Controller`.
 *
 * @param {AuthPasswordInputProps<TFieldValues, TName>} props The props for the component.
 * @returns A React component representing the password input field with its label and validation message.
 */
export function AuthPasswordInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  field,
  label,
  placeholder,
  disabled = false,
  id,
}: AuthPasswordInputProps<TFieldValues, TName>) {
  // State to manage password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Function to toggle the password visibility state
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <FormItem>
      <FormLabel htmlFor={id} className="text-xs font-normal md:text-sm">
        {label}
      </FormLabel>
      <FormControl>
        {/* A relative container for the input and the absolutely positioned toggle button. */}
        <div className="relative">
          <Input
            id={id}
            // The input type is dynamically changed to show or hide the password.
            type={showPassword ? "text" : "password"}
            placeholder={placeholder}
            disabled={disabled}
            className="h-9 border-2 border-slate-200 pr-10 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
            // Spreads the `field` object from react-hook-form to connect the input.
            {...field}
          />
          {/* Button to toggle password visibility */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 transform cursor-pointer text-slate-500 hover:bg-transparent hover:text-slate-700 md:right-2"
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {/* Conditionally renders the appropriate icon based on the visibility state. */}
            {showPassword ? (
              <PiEye size={18} className="md:h-5 md:w-5" />
            ) : (
              <PiEyeSlash size={18} className="md:h-5 md:w-5" />
            )}
          </Button>
        </div>
      </FormControl>
      <FormMessage className="text-xs" />
    </FormItem>
  );
}

AuthPasswordInput.displayName = "AuthPasswordInput";
