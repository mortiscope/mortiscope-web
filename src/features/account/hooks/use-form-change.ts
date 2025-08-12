"use client";

import { useMemo } from "react";
import { type FieldValues, type UseFormReturn } from "react-hook-form";

/**
 * Defines the return type and public API of the `useFormChange` hook.
 * @template T The type of the form values.
 */
type UseFormChangeReturn<T extends FieldValues> = {
  /** A boolean flag that is `true` if any form field has changed from its initial value. */
  hasChanges: boolean;
  /** An object where keys are the names of changed fields and the value is `true`. */
  changedFields: Partial<Record<keyof T, boolean>>;
  /** A helper function to check if a specific field has changed. */
  isFieldChanged: (fieldName: keyof T) => boolean;
  /** A function to reset the form back to its original `initialValues`. */
  resetChanges: () => void;
};

/**
 * A generic custom hook to detect changes in a `react-hook-form` instance by comparing its
 * current values against a set of initial values. It is useful for enabling/disabling
 * save buttons, showing "unsaved changes" warnings, or highlighting modified fields.
 *
 * @template T The type of the form values, extending `react-hook-form`'s `FieldValues`.
 * @param form The `UseFormReturn` instance from `react-hook-form`.
 * @param initialValues The original data object to compare against. If `null`, no changes will be detected.
 * @returns An object containing the change state and a reset function.
 */
export function useFormChange<T extends FieldValues>(
  form: UseFormReturn<T>,
  initialValues: T | null
): UseFormChangeReturn<T> {
  // Subscribes to all form value changes, triggering a re-render when any field is modified.
  const currentValues = form.watch();

  /**
   * Memoizes the calculation of changed fields.
   */
  const changedFields = useMemo(() => {
    // If there are no initial values to compare against, no fields can be considered "changed".
    if (!initialValues) {
      return {};
    }

    const changes: Partial<Record<keyof T, boolean>> = {};

    // Iterate over the current form values and compare each against its initial value.
    Object.keys(currentValues).forEach((key) => {
      const fieldKey = key as keyof T;
      const currentValue = currentValues[fieldKey];
      const initialValue = initialValues[fieldKey];

      // A simple but effective method for deep comparison of serializable objects.
      const isChanged = JSON.stringify(currentValue) !== JSON.stringify(initialValue);

      if (isChanged) {
        changes[fieldKey] = true;
      }
    });

    return changes;
  }, [currentValues, initialValues]);

  /** A derived boolean flag that is `true` if the `changedFields` object has any keys. */
  const hasChanges = Object.keys(changedFields).length > 0;

  /**
   * A stable helper function to check if a specific field has changed.
   * @param fieldName The name of the field to check.
   * @returns `true` if the field's value is different from its initial value.
   */
  const isFieldChanged = (fieldName: keyof T): boolean => {
    // Coerces the result to a boolean.
    return Boolean((changedFields as Record<keyof T, boolean>)[fieldName]);
  };

  /**
   * A stable handler function that resets the form's state back to the original `initialValues`
   * provided to the hook, discarding all user changes.
   */
  const resetChanges = () => {
    if (initialValues) {
      form.reset(initialValues);
    }
  };

  // Exposes the public API of the hook for the consuming component.
  return {
    hasChanges,
    changedFields,
    isFieldChanged,
    resetChanges,
  };
}
