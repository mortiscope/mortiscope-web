import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { useAccountDeletion } from "@/features/account/hooks/use-account-deletion";
import { useSocialProvider } from "@/features/account/hooks/use-social-provider";
import { useUpdateProfile } from "@/features/account/hooks/use-update-profile";

// Mock the social provider hook to simulate different authentication methods.
vi.mock("@/features/account/hooks/use-social-provider", () => ({
  useSocialProvider: vi.fn(),
}));

// Mock the profile update hook to intercept password verification and profile changes.
vi.mock("@/features/account/hooks/use-update-profile", () => ({
  useUpdateProfile: vi.fn(),
}));

// Create a mock function for the password verification mutation.
const mockVerifyMutate = vi.fn();

/**
 * Test suite for the `useAccountDeletion` custom hook logic.
 */
describe("useAccountDeletion", () => {
  // Reset mocks and provide default return values for dependencies before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSocialProvider).mockReturnValue({
      isSocialUser: false,
      isLoading: false,
      data: null,
      error: null,
      refetch: vi.fn(),
    });

    vi.mocked(useUpdateProfile).mockReturnValue({
      verifyPassword: {
        mutate: mockVerifyMutate,
        isPending: false,
        isSuccess: false,
        data: undefined,
      },
      updateProfile: {
        mutate: vi.fn(),
        isPending: false,
        isSuccess: false,
      },
    });
  });

  /**
   * Test case to verify the initial state of the hook upon mounting.
   */
  it("initializes with secure default defaults", () => {
    // Arrange: Render the hook to access the initial state.
    const { result } = renderHook(() => useAccountDeletion());

    // Assert: Verify that the password is locked, modal is closed, and deletion is disabled by default.
    expect(result.current.isPasswordLocked).toBe(true);
    expect(result.current.isModalOpen).toBe(false);
    expect(result.current.isDeleteEnabled).toBe(false);
    expect(result.current.form.getValues("password")).toBe("");
  });

  /**
   * Test case to verify how the hook handles a loading state from the social provider dependency.
   */
  it("handles loading state from social provider", () => {
    // Arrange: Mock the social provider to be in a loading state.
    vi.mocked(useSocialProvider).mockReturnValue({
      isSocialUser: false,
      isLoading: true,
      data: null,
      error: null,
      refetch: vi.fn(),
    });

    // Act: Render the hook under the loading condition.
    const { result } = renderHook(() => useAccountDeletion());

    // Assert: Verify that data is not marked as ready and deletion remains disabled.
    expect(result.current.isDataReady).toBe(false);
    expect(result.current.isDeleteEnabled).toBe(false);
  });

  /**
   * Test case to verify that social users can bypass password logic to enable deletion.
   */
  it("enables deletion immediately for unlocked social users", () => {
    // Arrange: Mock the social provider to return a social user.
    vi.mocked(useSocialProvider).mockReturnValue({
      isSocialUser: true,
      isLoading: false,
      data: null,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useAccountDeletion());

    // Assert: Verify that deletion is initially disabled.
    expect(result.current.isDeleteEnabled).toBe(false);

    // Act: Manually unlock the deletion state.
    act(() => {
      result.current.setIsDeleteLocked(false);
    });

    // Assert: Check if deletion is now enabled for the social user.
    expect(result.current.isDeleteEnabled).toBe(true);
  });

  /**
   * Test case to verify the toggling behavior of the password lock for credentials-based users.
   */
  it("manages password lock toggle logic for credential users", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useAccountDeletion());

    // Act: Trigger the password lock toggle to unlock the field.
    act(() => {
      result.current.handlePasswordLockToggle();
    });

    // Assert: Verify the field is no longer locked.
    expect(result.current.isPasswordLocked).toBe(false);

    // Act: Set a password value and toggle the lock back on.
    act(() => {
      result.current.form.setValue("password", "secret");
      result.current.handlePasswordLockToggle();
    });

    // Assert: Verify the field is locked and the password input is cleared for security.
    expect(result.current.isPasswordLocked).toBe(true);
    expect(result.current.form.getValues("password")).toBe("");
  });

  /**
   * Test case to verify that the password submit button state responds to validation and lock status.
   */
  it("enables password submission only when valid and unlocked", async () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useAccountDeletion());

    // Assert: Verify the submission is disabled by default.
    expect(result.current.isPasswordSubmitEnabled).toBe(false);

    // Act: Unlock the password field and set a valid password value.
    act(() => {
      result.current.handlePasswordLockToggle();
      result.current.form.setValue("password", "password123");
    });

    // Assert: Wait for the form validation state to update and enable the submit button.
    await waitFor(() => {
      expect(result.current.isPasswordSubmitEnabled).toBe(true);
    });
  });

  /**
   * Test case to verify the workflow following a successful password verification.
   */
  it("handles successful password verification", () => {
    // Arrange: Mock the mutation to immediately trigger the `onSuccess` callback.
    mockVerifyMutate.mockImplementation((_, options) => {
      options.onSuccess({ success: true });
    });

    const { result } = renderHook(() => useAccountDeletion());

    // Act: Setup the password and trigger the verification handler.
    act(() => {
      result.current.handlePasswordLockToggle();
      result.current.form.setValue("password", "correct-password");
    });

    act(() => {
      result.current.handlePasswordVerification();
    });

    // Assert: Verify the mutation was called with correct data and resulting states are updated.
    expect(mockVerifyMutate).toHaveBeenCalledWith(
      { currentPassword: "correct-password" },
      expect.any(Object)
    );
    expect(result.current.isPasswordVerified).toBe(true);
    expect(result.current.isDeleteEnabled).toBe(true);
  });

  /**
   * Test case to verify that modifying the password input invalidates previous verification.
   */
  it("resets verification when password input changes", () => {
    // Arrange: Mock a successful password verification.
    mockVerifyMutate.mockImplementation((_, options) => {
      options.onSuccess({ success: true });
    });

    const { result } = renderHook(() => useAccountDeletion());

    // Act: Verify the password.
    act(() => {
      result.current.handlePasswordLockToggle();
      result.current.form.setValue("password", "correct");
      result.current.handlePasswordVerification();
    });

    // Assert: Check that it is initially verified.
    expect(result.current.isPasswordVerified).toBe(true);

    // Act: Change the password input value.
    act(() => {
      result.current.handlePasswordChange("modified");
    });

    // Assert: Verify that the verified state and deletion permission are revoked.
    expect(result.current.isPasswordVerified).toBe(false);
    expect(result.current.isDeleteEnabled).toBe(false);
  });

  /**
   * Test case to verify that the modal visibility state is correctly managed.
   */
  it("manages modal visibility state", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useAccountDeletion());

    // Act: Open the modal.
    act(() => {
      result.current.setIsModalOpen(true);
    });

    // Assert: Verify the state reflects that the modal is open.
    expect(result.current.isModalOpen).toBe(true);
  });

  /**
   * Test case to verify that the password cannot be submitted again if already verified.
   */
  it("disables password submit if already verified", () => {
    // Arrange: Mock a successful verification.
    mockVerifyMutate.mockImplementation((_, options) => {
      options.onSuccess({ success: true });
    });

    const { result } = renderHook(() => useAccountDeletion());

    // Act: Verify the password.
    act(() => {
      result.current.handlePasswordLockToggle();
      result.current.form.setValue("password", "correct");
      result.current.handlePasswordVerification();
    });

    // Assert: Verify that even with a valid password, the button is disabled because `isPasswordVerified` is true.
    expect(result.current.isPasswordVerified).toBe(true);
    expect(result.current.isPasswordSubmitEnabled).toBe(false);
  });

  /**
   * Test case to verify the state update when password verification fails.
   */
  it("handles failed password verification", () => {
    // Arrange: Mock the mutation to return a failure response.
    mockVerifyMutate.mockImplementation((_, options) => {
      options.onSuccess({ success: false });
    });

    const { result } = renderHook(() => useAccountDeletion());

    // Act: Attempt to verify an incorrect password.
    act(() => {
      result.current.handlePasswordLockToggle();
      result.current.form.setValue("password", "wrong-password");
      result.current.handlePasswordVerification();
    });

    // Assert: Verify that the password is not marked as verified.
    expect(result.current.isPasswordVerified).toBe(false);
  });

  /**
   * Test case to verify that password change logic handles the transition from an unverified state correctly.
   */
  it("does not reset verification when already unverified", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useAccountDeletion());

    // Assert: Confirm the state is initially unverified.
    expect(result.current.isPasswordVerified).toBe(false);

    // Act: Change the password input while it is already unverified.
    act(() => {
      result.current.handlePasswordChange("new-input");
    });

    // Assert: Ensure the state remains unverified without unnecessary state transitions.
    expect(result.current.isPasswordVerified).toBe(false);
  });
});
