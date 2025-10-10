import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook } from "@/__tests__/setup/test-utils";
import { useEmailField } from "@/features/account/hooks/use-email-field";
import { useFormChange } from "@/features/account/hooks/use-form-change";
import { useUpdateEmail } from "@/features/account/hooks/use-update-email";

// Mock the form change tracking hook to control field change detection logic.
vi.mock("@/features/account/hooks/use-form-change", () => ({
  useFormChange: vi.fn(),
}));

// Mock the email update mutation hook to intercept and verify update requests.
vi.mock("@/features/account/hooks/use-update-email", () => ({
  useUpdateEmail: vi.fn(),
}));

/**
 * Test suite for the `useEmailField` custom hook.
 */
describe("useEmailField", () => {
  const mockIsFieldChanged = vi.fn();
  const mockMutate = vi.fn();
  const defaultSecurityData = {
    email: "mortiscope@example.com",
  };

  // Reset all mocks and provide default implementation for hooks before each test case.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFormChange).mockReturnValue({
      isFieldChanged: mockIsFieldChanged,
      hasChanges: false,
      changedFields: {},
      resetChanges: vi.fn(),
    });

    vi.mocked(useUpdateEmail).mockReturnValue({
      updateEmail: {
        mutate: mockMutate,
        isPending: false,
        isSuccess: false,
      },
    });

    mockIsFieldChanged.mockReturnValue(false);
  });

  /**
   * Test case to verify that the hook starts with the email field locked and populated.
   */
  it("initializes with locked state and provided security data", () => {
    // Arrange: Render the hook with default email data.
    const { result } = renderHook(() => useEmailField({ securityData: defaultSecurityData }));

    // Assert: Verify that the field is locked and the value matches the `securityData`.
    expect(result.current.isEmailLocked).toBe(true);
    expect(result.current.form.getValues("email")).toBe("mortiscope@example.com");
  });

  /**
   * Test case to verify that the form value synchronizes when the `securityData` prop is updated.
   */
  it("updates form values when security data changes", () => {
    // Arrange: Initial render with standard email.
    const { result, rerender } = renderHook(({ data }) => useEmailField({ securityData: data }), {
      initialProps: { data: defaultSecurityData },
    });

    expect(result.current.form.getValues("email")).toBe("mortiscope@example.com");

    // Act: Rerender the hook with a new email address in props.
    rerender({
      data: { email: "updated@example.com" },
    });

    // Assert: Check if the form internal value has updated to match the new prop.
    expect(result.current.form.getValues("email")).toBe("updated@example.com");
  });

  /**
   * Test case to verify the logic for toggling the `isEmailLocked` boolean state.
   */
  it("toggles lock state correctly", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useEmailField({ securityData: defaultSecurityData }));

    expect(result.current.isEmailLocked).toBe(true);

    // Act: Invoke the toggle handler to unlock.
    act(() => {
      result.current.handleEmailLockToggle();
    });

    // Assert: Field should now be unlocked.
    expect(result.current.isEmailLocked).toBe(false);

    // Act: Invoke the toggle handler again to lock.
    act(() => {
      result.current.handleEmailLockToggle();
    });

    // Assert: Field should return to locked state.
    expect(result.current.isEmailLocked).toBe(true);
  });

  /**
   * Test case to verify that closing the edit mode resets any unsaved changes in the field.
   */
  it("resets form value to initial when toggling from unlocked to locked", () => {
    // Arrange: Render and unlock the field.
    const { result } = renderHook(() => useEmailField({ securityData: defaultSecurityData }));

    act(() => {
      result.current.handleEmailLockToggle();
    });

    // Act: Modify the email value while unlocked.
    act(() => {
      result.current.form.setValue("email", "changed@example.com");
    });

    expect(result.current.form.getValues("email")).toBe("changed@example.com");

    // Act: Re-lock the field without saving.
    act(() => {
      result.current.handleEmailLockToggle();
    });

    // Assert: Verify the state is locked and the value has reverted to the original `securityData` value.
    expect(result.current.isEmailLocked).toBe(true);
    expect(result.current.form.getValues("email")).toBe("mortiscope@example.com");
  });

  /**
   * Test case to verify the conditions required to enable the save button.
   */
  it("enables save button when unlocked, changed, and valid", () => {
    // Arrange: Mock the change tracker to report a dirty field.
    mockIsFieldChanged.mockReturnValue(true);

    const { result } = renderHook(() => useEmailField({ securityData: defaultSecurityData }));

    // Act: Unlock the field for editing.
    act(() => {
      result.current.handleEmailLockToggle();
    });

    // Assert: Verify that save is enabled because it is unlocked and changed.
    expect(result.current.isEmailSaveEnabled).toBe(true);
  });

  /**
   * Test case to verify that the save button is disabled when the field is in a locked state.
   */
  it("disables save button when locked", () => {
    // Arrange: Mock the change tracker to return true.
    mockIsFieldChanged.mockReturnValue(true);

    // Act: Render without unlocking.
    const { result } = renderHook(() => useEmailField({ securityData: defaultSecurityData }));

    // Assert: The button should be disabled despite changes because `isEmailLocked` is true.
    expect(result.current.isEmailLocked).toBe(true);
    expect(result.current.isEmailSaveEnabled).toBe(false);
  });

  /**
   * Test case to verify that the save button is disabled if the value matches the original.
   */
  it("disables save button when field is unchanged", () => {
    // Arrange: Mock the change tracker to report no changes.
    mockIsFieldChanged.mockReturnValue(false);

    const { result } = renderHook(() => useEmailField({ securityData: defaultSecurityData }));

    // Act: Unlock the field.
    act(() => {
      result.current.handleEmailLockToggle();
    });

    // Assert: Save should be disabled because `isFieldChanged` is false.
    expect(result.current.isEmailSaveEnabled).toBe(false);
  });

  /**
   * Test case to verify that the save button is disabled while an update operation is in progress.
   */
  it("disables save button when update is pending", () => {
    // Arrange: Mock the update mutation to be in a pending state.
    vi.mocked(useUpdateEmail).mockReturnValue({
      updateEmail: {
        mutate: mockMutate,
        isPending: true,
        isSuccess: false,
      },
    });
    mockIsFieldChanged.mockReturnValue(true);

    const { result } = renderHook(() => useEmailField({ securityData: defaultSecurityData }));

    // Act: Unlock the field.
    act(() => {
      result.current.handleEmailLockToggle();
    });

    // Assert: Button must be disabled to prevent duplicate submissions.
    expect(result.current.isEmailSaveEnabled).toBe(false);
  });

  /**
   * Test case to verify that the mutation is triggered with the correct parameters upon saving.
   */
  it("calls update mutation with correct values on save", () => {
    // Arrange: Render the hook and set a new email value.
    const { result } = renderHook(() => useEmailField({ securityData: defaultSecurityData }));

    act(() => {
      result.current.handleEmailLockToggle();
      result.current.form.setValue("email", "new@example.com");
    });

    // Act: Trigger the email update submission.
    act(() => {
      result.current.handleEmailUpdate();
    });

    // Assert: Verify the mutation received the new email and an empty password placeholder.
    expect(mockMutate).toHaveBeenCalledWith({
      email: "new@example.com",
      currentPassword: "",
    });
  });

  /**
   * Test case to verify the robustness of the hook when `securityData` is missing.
   */
  it("handles null security data gracefully", () => {
    // Act: Render with null data.
    const { result } = renderHook(() => useEmailField({ securityData: null }));

    // Assert: The form should initialize with an empty string rather than crashing.
    expect(result.current.form.getValues("email")).toBe("");
  });

  /**
   * Test case to verify the fallback behavior when the email property specifically is null.
   */
  it("uses empty string fallback when security data email is null", () => {
    // Arrange: Construct data with a null email.
    const securityData = { email: null };

    // Act: Render the hook.
    const { result } = renderHook(() => useEmailField({ securityData }));

    // Assert: Check if the fallback empty string is applied.
    expect(result.current.form.getValues("email")).toBe("");
  });

  /**
   * Test case to verify that resetting logic is skipped if there is no initial data to revert to.
   */
  it("does not reset form values on lock toggle if initial values are missing", () => {
    // Arrange: Initialize with no data.
    const { result } = renderHook(() => useEmailField({ securityData: null }));

    // Act: Set a value and toggle the lock states.
    act(() => {
      result.current.form.setValue("email", "changed@example.com");
      result.current.handleEmailLockToggle();
    });

    expect(result.current.isEmailLocked).toBe(false);

    act(() => {
      result.current.handleEmailLockToggle();
    });

    // Assert: Since no initial value exists, the modified value should persist after re-locking.
    expect(result.current.isEmailLocked).toBe(true);
    expect(result.current.form.getValues("email")).toBe("changed@example.com");
  });
});
