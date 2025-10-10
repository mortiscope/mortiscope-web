import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { usePasswordChange } from "@/features/account/hooks/use-password-change";

// Mock functions to track calls to the verification and update mutations.
const mockVerifyMutate = vi.fn();
const mockUpdateMutate = vi.fn();

// Mock the profile update hook to control password verification behavior.
vi.mock("@/features/account/hooks/use-update-profile", () => ({
  useUpdateProfile: () => ({
    verifyPassword: {
      mutate: mockVerifyMutate,
      isPending: false,
    },
  }),
}));

// Mock the password update hook to control the final submission behavior.
vi.mock("@/features/account/hooks/use-update-password", () => ({
  useUpdatePassword: () => ({
    updatePassword: {
      mutate: mockUpdateMutate,
      isPending: false,
    },
  }),
}));

/**
 * Test suite for the `usePasswordChange` custom hook.
 */
describe("usePasswordChange", () => {
  // Reset all mock functions before each test to maintain execution isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the hook starts with the expected initial values.
   */
  it("initializes with default locked state", () => {
    // Arrange: Render the hook into the test environment.
    const { result } = renderHook(() => usePasswordChange());

    // Assert: Verify that the UI starts locked and the form values are empty.
    expect(result.current.isPasswordLocked).toBe(true);
    expect(result.current.isPasswordVerified).toBe(false);
    expect(result.current.form.getValues()).toEqual({
      currentPassword: "",
      newPassword: "",
      repeatPassword: "",
    });
  });

  /**
   * Test case to verify that toggling the lock state correctly updates the boolean and clears inputs.
   */
  it("toggles lock state and resets form when locking", async () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => usePasswordChange());

    // Act: Unlock the password fields.
    act(() => {
      result.current.handlePasswordLockToggle();
    });

    // Assert: Verify the `isPasswordLocked` state is false.
    expect(result.current.isPasswordLocked).toBe(false);

    // Act: Set a value and then re-lock the component.
    act(() => {
      result.current.form.setValue("currentPassword", "password123");
      result.current.handlePasswordLockToggle();
    });

    // Assert: Verify state is locked and `currentPassword` is cleared.
    expect(result.current.isPasswordLocked).toBe(true);
    expect(result.current.form.getValues("currentPassword")).toBe("");
  });

  /**
   * Test case to verify that password visibility states are managed correctly.
   */
  it("manages visibility toggles", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => usePasswordChange());

    // Act: Update all password visibility states to true.
    act(() => {
      result.current.setShowCurrentPassword(true);
      result.current.setShowNewPassword(true);
      result.current.setShowConfirmPassword(true);
    });

    // Assert: Verify that visibility booleans reflect the updates.
    expect(result.current.showCurrentPassword).toBe(true);
    expect(result.current.showNewPassword).toBe(true);
    expect(result.current.showConfirmPassword).toBe(true);
  });

  /**
   * Test case to verify that the submission button logic respects the current password input.
   */
  it("enables submit button only when valid current password is entered", async () => {
    // Arrange: Render hook and unlock the form.
    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.handlePasswordLockToggle();
    });

    // Assert: Check that `isPasswordSubmitEnabled` is initially false.
    expect(result.current.isPasswordSubmitEnabled).toBe(false);

    // Act: Set the `currentPassword` value.
    act(() => {
      result.current.form.setValue("currentPassword", "password123");
    });

    // Assert: Wait for the form state to update and enable the button.
    await waitFor(() => {
      expect(result.current.isPasswordSubmitEnabled).toBe(true);
    });
  });

  /**
   * Test case to verify the successful verification of the existing password.
   */
  it("handles password verification success", async () => {
    // Arrange: Mock a successful response from the `verifyPassword` mutation.
    mockVerifyMutate.mockImplementation((_, options) => {
      options.onSuccess({ success: true });
    });

    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.handlePasswordLockToggle();
      result.current.form.setValue("currentPassword", "password123");
    });

    // Act: Trigger the verification logic.
    act(() => {
      result.current.handlePasswordVerification();
    });

    // Assert: Verify the mutation was called with the correct `currentPassword` and state updated.
    expect(mockVerifyMutate).toHaveBeenCalledWith(
      { currentPassword: "password123" },
      expect.any(Object)
    );
    expect(result.current.isPasswordVerified).toBe(true);
  });

  /**
   * Test case to verify that state remains unverified if the server rejects the password.
   */
  it("does not verify password on failure response", async () => {
    // Arrange: Mock a failed response from the `verifyPassword` mutation.
    mockVerifyMutate.mockImplementation((_, options) => {
      options.onSuccess({ success: false });
    });

    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.handlePasswordLockToggle();
      result.current.form.setValue("currentPassword", "wrongpass");
    });

    // Act: Trigger verification.
    act(() => {
      result.current.handlePasswordVerification();
    });

    // Assert: Verify that `isPasswordVerified` remains false.
    expect(result.current.isPasswordVerified).toBe(false);
  });

  /**
   * Test case to verify that editing the current password resets any existing verification status.
   */
  it("resets verification when current password changes", async () => {
    // Arrange: Mock successful verification first.
    mockVerifyMutate.mockImplementation((_, options) => {
      options.onSuccess({ success: true });
    });

    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.handlePasswordLockToggle();
      result.current.form.setValue("currentPassword", "password123");
      result.current.handlePasswordVerification();
    });

    expect(result.current.isPasswordVerified).toBe(true);

    // Act: Simulate the user typing a new character into the `currentPassword` field.
    act(() => {
      result.current.handleCurrentPasswordChange("password1234");
    });

    // Assert: Verify that the hook reset `isPasswordVerified` to false.
    expect(result.current.isPasswordVerified).toBe(false);
  });

  /**
   * Test case to verify that typing doesn't flip the verification state if it wasn't already verified.
   */
  it("does not change verification state when current password changes if not verified", () => {
    // Arrange: Render the hook and ensure it is in an unverified state.
    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.handlePasswordLockToggle();
      expect(result.current.isPasswordVerified).toBe(false);
    });

    // Act: Change the current password input.
    act(() => {
      result.current.handleCurrentPasswordChange("typing...");
    });

    // Assert: Verify state remains false.
    expect(result.current.isPasswordVerified).toBe(false);
  });

  /**
   * Test case to verify validation logic when the new and repeat passwords do not match.
   */
  it("validates mismatching passwords", async () => {
    // Arrange: Render hook and set mismatching values for the new password fields.
    const { result } = renderHook(() => usePasswordChange());

    act(() => {
      result.current.handlePasswordLockToggle();
      result.current.form.setValue("newPassword", "newpassword123");
      result.current.form.setValue("repeatPassword", "differentpassword123");
      result.current.form.trigger();
    });

    // Assert: Wait for validation to run and check for the mismatch error message.
    await waitFor(() => {
      expect(result.current.newPasswordFieldsError).toBe("Passwords don't match.");
    });
  });

  /**
   * Test case to verify the complete process from verification to final password update.
   */
  it("handles full password update flow", async () => {
    // Arrange: Mock the verification mutation to succeed.
    mockVerifyMutate.mockImplementation((_, options) => {
      options.onSuccess({ success: true });
    });

    const { result } = renderHook(() => usePasswordChange());

    // Act: Perform password verification.
    act(() => {
      result.current.handlePasswordLockToggle();
      result.current.form.setValue("currentPassword", "current123");
    });

    act(() => {
      result.current.handlePasswordVerification();
    });

    // Act: Input valid matching new passwords.
    act(() => {
      result.current.form.setValue("newPassword", "newpass123");
      result.current.form.setValue("repeatPassword", "newpass123");
    });

    // Assert: Ensure the save button becomes enabled.
    await waitFor(() => {
      expect(result.current.isNewPasswordSaveEnabled).toBe(true);
    });

    // Act: Submit the password update.
    act(() => {
      result.current.handlePasswordUpdate();
    });

    // Assert: Verify the `updatePassword` mutation was called with the full form payload.
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      currentPassword: "current123",
      newPassword: "newpass123",
      repeatPassword: "newpass123",
    });
  });
});
