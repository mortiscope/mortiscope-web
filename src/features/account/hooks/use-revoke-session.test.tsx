import { act } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook } from "@/__tests__/setup/test-utils";
import type { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { revokeSession } from "@/features/account/actions/revoke-session";
import { useRevokeSession } from "@/features/account/hooks/use-revoke-session";

// Mock the server action responsible for revoking a user session.
vi.mock("@/features/account/actions/revoke-session", () => ({
  revokeSession: vi.fn(),
}));

// Mock the toast notification system to verify user feedback.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Test suite for the `useRevokeSession` custom hook.
 */
describe("useRevokeSession", () => {
  const mockUserId = "user-123";
  const mockCurrentToken = "token-current";
  const mockOnSuccess = vi.fn();
  const mockOnClose = vi.fn();

  // Define a standard session object used for testing revocation logic.
  const mockSession: UserSessionInfo = {
    id: "session-abc",
    sessionToken: "token-other",
    ipAddress: "127.0.0.1",
    browser: "Chrome 120.0",
    operatingSystem: "Windows 11",
    device: "Desktop",
    location: "City 1, Region 1, Philippines",
    dateAdded: new Date(),
    lastActive: new Date(),
    isCurrentSession: false,
    isActiveNow: false,
  };

  // Clear all mock call histories before each test case to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the hook initializes with the correct default loading state.
   */
  it("initializes with isSigningOut as false", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useRevokeSession(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Assert: Verify that the `isSigningOut` boolean is initially false.
    expect(result.current.isSigningOut).toBe(false);
  });

  /**
   * Test case to verify that the hook avoids execution if no session object is provided.
   */
  it("does nothing if session provided is null", async () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useRevokeSession(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Attempt to sign out with a null session.
    await act(async () => {
      await result.current.handleSignOut(null);
    });

    // Assert: Verify the server action was not called and loading state remains false.
    expect(revokeSession).not.toHaveBeenCalled();
    expect(result.current.isSigningOut).toBe(false);
  });

  /**
   * Test case to verify that the hook prevents users from revoking their own active session through this specific handler.
   */
  it("does nothing if trying to revoke the current session", async () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useRevokeSession(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Create a session object where the token matches the `mockCurrentToken`.
    const currentSession = { ...mockSession, sessionToken: mockCurrentToken };

    // Act: Attempt to revoke the current session.
    await act(async () => {
      await result.current.handleSignOut(currentSession);
    });

    // Assert: Verify that the action was blocked based on token matching.
    expect(revokeSession).not.toHaveBeenCalled();
    expect(result.current.isSigningOut).toBe(false);
  });

  /**
   * Test case to verify the successful execution of the session revocation flow.
   */
  it("calls revokeSession successfully", async () => {
    // Arrange: Mock the `revokeSession` server action to return success.
    vi.mocked(revokeSession).mockResolvedValue({ success: true });

    const { result } = renderHook(() =>
      useRevokeSession(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Trigger the sign-out process.
    let promise: Promise<void>;
    act(() => {
      promise = result.current.handleSignOut(mockSession);
    });

    // Assert: Verify the loading state is active immediately after invocation.
    expect(result.current.isSigningOut).toBe(true);

    // Act: Wait for the asynchronous process to complete.
    await act(async () => {
      await promise;
    });

    // Assert: Verify the action was called with correct IDs and callbacks were triggered.
    expect(revokeSession).toHaveBeenCalledWith(mockSession.id, mockUserId);
    expect(toast.success).toHaveBeenCalledWith("Session revoked successfully.", {
      className: "font-inter",
    });
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  /**
   * Test case to verify that server-side errors are caught and displayed to the user.
   */
  it("handles server action error", async () => {
    // Arrange: Mock the server action to return a specific error message.
    vi.mocked(revokeSession).mockResolvedValue({ success: false, error: "Database error" });

    const { result } = renderHook(() =>
      useRevokeSession(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Attempt to revoke the session.
    await act(async () => {
      await result.current.handleSignOut(mockSession);
    });

    // Assert: Verify that the error toast used the message from the server.
    expect(revokeSession).toHaveBeenCalledWith(mockSession.id, mockUserId);
    expect(toast.error).toHaveBeenCalledWith("Database error", {
      className: "font-inter",
    });
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(result.current.isSigningOut).toBe(false);
  });

  /**
   * Test case to verify that a generic error message is used if the server provides no specific details.
   */
  it("handles server action error with fallback message", async () => {
    // Arrange: Mock server failure with no specific error string.
    vi.mocked(revokeSession).mockResolvedValue({ success: false });

    const { result } = renderHook(() =>
      useRevokeSession(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Attempt to revoke the session.
    await act(async () => {
      await result.current.handleSignOut(mockSession);
    });

    // Assert: Verify the fallback message was displayed to the user.
    expect(revokeSession).toHaveBeenCalledWith(mockSession.id, mockUserId);
    expect(toast.error).toHaveBeenCalledWith("Failed to revoke session.", {
      className: "font-inter",
    });
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
    expect(result.current.isSigningOut).toBe(false);
  });

  /**
   * Test case to verify that unexpected exceptions (e.g., network failure) are caught by the hook.
   */
  it("handles unexpected exceptions", async () => {
    // Arrange: Mock the server action to throw an exception.
    vi.mocked(revokeSession).mockRejectedValue(new Error("Network fail"));

    const { result } = renderHook(() =>
      useRevokeSession(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Attempt to revoke the session.
    await act(async () => {
      await result.current.handleSignOut(mockSession);
    });

    // Assert: Verify the generic unexpected error message was displayed.
    expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.", {
      className: "font-inter",
    });
    expect(result.current.isSigningOut).toBe(false);
  });

  /**
   * Test case to verify that the loading state can be manually reset via the `resetState` method.
   */
  it("resetState sets isSigningOut to false", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() =>
      useRevokeSession(mockUserId, mockCurrentToken, mockOnSuccess, mockOnClose)
    );

    // Act: Invoke the `resetState` function.
    act(() => {
      result.current.resetState();
    });

    // Assert: Verify that `isSigningOut` is set to false.
    expect(result.current.isSigningOut).toBe(false);
  });
});
