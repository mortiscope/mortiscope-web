import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { act, renderHook } from "@/__tests__/setup/test-utils";
import { useFormChange } from "@/features/account/hooks/use-form-change";

/**
 * Test suite for the `useFormChange` custom hook.
 */
describe("useFormChange", () => {
  /**
   * Test case to verify that no changes are detected when the form is in its initial state.
   */
  it("initializes with no changes when form values match initial values", () => {
    // Arrange: Define starting values and render the hook alongside a form instance.
    const initialValues = { name: "John", age: 30 };
    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: initialValues });
      const changeState = useFormChange(form, initialValues);
      return { form, changeState };
    });

    // Assert: Check that `hasChanges` is false and the map of `changedFields` is empty.
    expect(result.current.changeState.hasChanges).toBe(false);
    expect(result.current.changeState.changedFields).toEqual({});
  });

  /**
   * Test case to verify that the hook accurately identifies which field has been modified.
   */
  it("detects changes when a field is modified", () => {
    // Arrange: Initialize form with default user data.
    const initialValues = { name: "John", age: 30 };
    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: initialValues });
      const changeState = useFormChange(form, initialValues);
      return { form, changeState };
    });

    // Act: Change the value of the `name` field using the form controller.
    act(() => {
      result.current.form.setValue("name", "Jane");
    });

    // Assert: Verify that the overall change state is true and specifically identifies the `name` field.
    expect(result.current.changeState.hasChanges).toBe(true);
    expect(result.current.changeState.changedFields).toEqual({ name: true });
    expect(result.current.changeState.isFieldChanged("name")).toBe(true);
    expect(result.current.changeState.isFieldChanged("age")).toBe(false);
  });

  /**
   * Test case to verify that reverting a field to its original value clears the change status.
   */
  it("detects no changes if field is modified back to original value", () => {
    // Arrange: Setup hook with initial state.
    const initialValues = { name: "John", age: 30 };
    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: initialValues });
      const changeState = useFormChange(form, initialValues);
      return { form, changeState };
    });

    // Act: Modify the field to trigger a change state.
    act(() => {
      result.current.form.setValue("name", "Jane");
    });

    expect(result.current.changeState.hasChanges).toBe(true);

    // Act: Revert the field to the exact value stored in `initialValues`.
    act(() => {
      result.current.form.setValue("name", "John");
    });

    // Assert: Verify that `hasChanges` returns to false as the current state matches the origin.
    expect(result.current.changeState.hasChanges).toBe(false);
    expect(result.current.changeState.changedFields).toEqual({});
  });

  /**
   * Test case to verify that the hook performs deep equality checks for nested objects.
   */
  it("handles deep object comparison correctly", () => {
    // Arrange: Define a nested configuration object as initial values.
    const initialValues = { config: { theme: "dark", notifications: true } };
    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: initialValues });
      const changeState = useFormChange(form, initialValues);
      return { form, changeState };
    });

    // Act: Update a property within the nested `config` object.
    act(() => {
      result.current.form.setValue("config", { theme: "light", notifications: true });
    });

    // Assert: Verify that the hook detects the change inside the nested structure.
    expect(result.current.changeState.hasChanges).toBe(true);
    expect(result.current.changeState.isFieldChanged("config")).toBe(true);
  });

  /**
   * Test case to verify that the hook remains inert if no comparison data is provided.
   */
  it("returns no changes if initialValues is null", () => {
    // Arrange: Pass `null` as the second argument to the hook.
    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: { name: "John" } });
      const changeState = useFormChange(form, null);
      return { form, changeState };
    });

    // Act: Modify the form values.
    act(() => {
      result.current.form.setValue("name", "Jane");
    });

    // Assert: Ensure that change tracking is disabled and no changes are reported when `initialValues` is missing.
    expect(result.current.changeState.hasChanges).toBe(false);
    expect(result.current.changeState.changedFields).toEqual({});

    // Act: Verify the `resetChanges` function can be called safely without error.
    act(() => {
      result.current.changeState.resetChanges();
    });
  });

  /**
   * Test case to verify that calling resetChanges restores the form to its original data.
   */
  it("resets form values to initial values when resetChanges is called", () => {
    // Arrange: Initialize form and hook with default data.
    const initialValues = { name: "John", age: 30 };
    const { result } = renderHook(() => {
      const form = useForm({ defaultValues: initialValues });
      const changeState = useFormChange(form, initialValues);
      return { form, changeState };
    });

    // Act: Apply multiple changes to the form state.
    act(() => {
      result.current.form.setValue("name", "Jane");
      result.current.form.setValue("age", 35);
    });

    expect(result.current.form.getValues()).toEqual({ name: "Jane", age: 35 });

    // Act: Trigger the reset action provided by the hook.
    act(() => {
      result.current.changeState.resetChanges();
    });

    // Assert: Confirm the form values match `initialValues` and `hasChanges` is reset to false.
    expect(result.current.form.getValues()).toEqual(initialValues);
    expect(result.current.changeState.hasChanges).toBe(false);
  });
});
