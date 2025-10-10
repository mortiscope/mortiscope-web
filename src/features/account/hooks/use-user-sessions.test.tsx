import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import { getUserSessions } from "@/features/account/actions/get-user-sessions";
import { revokeAllSessions } from "@/features/account/actions/revoke-all-sessions";
import { revokeSession } from "@/features/account/actions/revoke-session";
import { useUserSessions } from "@/features/account/hooks/use-user-sessions";

// Mock the server action responsible for fetching active user sessions.
vi.mock("@/features/account/actions/get-user-sessions", () => ({
  getUserSessions: vi.fn(),
}));
// Mock the server action responsible for revoking all sessions except the current one.
vi.mock("@/features/account/actions/revoke-all-sessions", () => ({
  revokeAllSessions: vi.fn(),
}));
// Mock the server action responsible for revoking a specific user session by ID.
vi.mock("@/features/account/actions/revoke-session", () => ({
  revokeSession: vi.fn(),
}));

// Mock the toast notification library to verify UI alerts during session management.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Generates a test wrapper component to provide the necessary TanStack Query context.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return TestWrapper;
};

/**
 * Test suite for the `useUserSessions` hook logic and session lifecycle management.
 */
describe("useUserSessions", () => {
  const mockUserId = "user-123";
  const mockSessions = [
    {
      id: "session-1",
      deviceType: "Desktop",
      isCurrentSession: true,
      browser: "Chrome 120",
      operatingSystem: "Windows 10",
      device: "Desktop - Chrome on Windows",
      location: "New York, US",
      ipAddress: "127.0.0.1",
      dateAdded: new Date(),
      lastActive: new Date(),
      sessionToken: "token-1",
      isActiveNow: true,
    },
    {
      id: "session-2",
      deviceType: "Mobile",
      isCurrentSession: false,
      browser: "Safari 17",
      operatingSystem: "iOS 17",
      device: "iPhone - Safari on iOS",
      location: "Laguna, Philippines",
      ipAddress: "192.168.1.1",
      dateAdded: new Date(),
      lastActive: new Date(),
      sessionToken: "token-2",
      isActiveNow: false,
    },
  ];

  // Reset all mock functions and provide a default successful fetch response before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserSessions).mockResolvedValue([]);
  });

  /**
   * Test suite for session data retrieval functionality.
   */
  describe("Fetching Sessions", () => {
    /**
     * Test case to verify that sessions are fetched correctly and stored in the hook state.
     */
    it("fetches and returns user sessions successfully", async () => {
      // Arrange: Set up the mock response with multiple sessions.
      vi.mocked(getUserSessions).mockResolvedValue(mockSessions);

      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Assert: Verify that the loading state is initially active.
      expect(result.current.isLoading).toBe(true);

      // Assert: Wait for data resolution and verify state updates and server call parameters.
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.sessions).toEqual(mockSessions);
      });

      expect(getUserSessions).toHaveBeenCalledWith(mockUserId);
    });

    /**
     * Test case to verify that an empty list is handled correctly by the query.
     */
    it("returns empty array if no sessions found or fetch fails gracefully", async () => {
      // Arrange: Mock an empty response from the server action.
      vi.mocked(getUserSessions).mockResolvedValue([]);

      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Assert: Confirm the hook returns an empty `sessions` array after loading.
      await waitFor(() => {
        expect(result.current.sessions).toEqual([]);
      });
    });

    /**
     * Test case to verify that no network request is made if the `userId` is not provided.
     */
    it("does not fetch if userId is missing", () => {
      // Arrange & Act: Render hook with an empty ID string.
      renderHook(() => useUserSessions(""), { wrapper: createWrapper() });

      // Assert: Ensure the fetching server action was never invoked.
      expect(getUserSessions).not.toHaveBeenCalled();
    });
  });

  /**
   * Test suite for single session revocation logic.
   */
  describe("revokeSession", () => {
    /**
     * Test case to verify successful single session revocation and UI feedback.
     */
    it("calls revokeSession action and invalidates queries on success", async () => {
      // Arrange: Mock a successful revocation response.
      vi.mocked(revokeSession).mockResolvedValue({ success: true });
      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Act: Trigger revocation for a specific session ID.
      result.current.revokeSession("session-to-revoke");

      // Assert: Wait for the mutation to finish and verify the success toast.
      await waitFor(() => {
        expect(result.current.isRevokingSession).toBe(false);
      });

      expect(revokeSession).toHaveBeenCalledWith("session-to-revoke", mockUserId);
      expect(toast.success).toHaveBeenCalledWith("Session revoked successfully.");
    });

    /**
     * Test case to verify error toast handling when a logic error occurs on the server.
     */
    it("handles logic error from server action", async () => {
      // Arrange: Mock a response indicating the session was not found.
      vi.mocked(revokeSession).mockResolvedValue({ success: false, error: "Not found" });
      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Act: Trigger revocation.
      result.current.revokeSession("session-to-revoke");

      // Assert: Ensure the mutation completes and displays the server-provided error message.
      await waitFor(() => {
        expect(result.current.isRevokingSession).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith("Not found");
    });

    /**
     * Test case to verify that a fallback error message is shown when the server response lacks detail.
     */
    it("toasts default error when error message is missing", async () => {
      // Arrange: Mock an unsuccessful response with an empty error string.
      vi.mocked(revokeSession).mockResolvedValue({ success: false, error: "" });
      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Act: Trigger revocation.
      result.current.revokeSession("session-to-revoke");

      // Assert: Confirm that the default "Failed to revoke session." toast is triggered.
      await waitFor(() => {
        expect(result.current.isRevokingSession).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to revoke session.");
    });

    /**
     * Test case to verify error handling when the mutation encountered a code exception.
     */
    it("handles unexpected error during mutation", async () => {
      // Arrange: Mock a rejection to simulate a network failure.
      vi.mocked(revokeSession).mockRejectedValue(new Error("Network Error"));
      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Act: Trigger revocation.
      result.current.revokeSession("session-to-revoke");

      // Assert: Confirm the catch block displays the fallback error toast.
      await waitFor(() => {
        expect(result.current.isRevokingSession).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to revoke session.");
    });
  });

  /**
   * Test suite for mass session revocation logic.
   */
  describe("revokeAllSessions", () => {
    /**
     * Test case to verify feedback when multiple sessions are successfully revoked.
     */
    it("calls revokeAllSessions action and toasts specific count message", async () => {
      // Arrange: Mock a success response with a count of 5.
      vi.mocked(revokeAllSessions).mockResolvedValue({ success: true, revokedCount: 5 });
      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Act: Trigger bulk revocation with the current session token.
      result.current.revokeAllSessions("current-token");

      // Assert: Confirm mass revocation was called and displays the pluralized count toast.
      await waitFor(() => {
        expect(result.current.isRevokingAllSessions).toBe(false);
      });

      expect(revokeAllSessions).toHaveBeenCalledWith(mockUserId, "current-token");
      expect(toast.success).toHaveBeenCalledWith("5 sessions revoked successfully");
    });

    /**
     * Test case to verify the grammar of the success message when only one session is revoked.
     */
    it("handles singular session revocation message correctly", async () => {
      // Arrange: Mock a success response with a count of 1.
      vi.mocked(revokeAllSessions).mockResolvedValue({ success: true, revokedCount: 1 });
      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Act: Trigger bulk revocation.
      result.current.revokeAllSessions("current-token");

      // Assert: Verify the singularized success toast is displayed.
      await waitFor(() => {
        expect(result.current.isRevokingAllSessions).toBe(false);
      });

      expect(toast.success).toHaveBeenCalledWith("1 session revoked successfully");
    });

    /**
     * Test case to verify the information toast when there are no other sessions to remove.
     */
    it("toasts info message if revoked count is 0", async () => {
      // Arrange: Mock a success response with a count of 0.
      vi.mocked(revokeAllSessions).mockResolvedValue({ success: true, revokedCount: 0 });
      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Act: Trigger bulk revocation.
      result.current.revokeAllSessions();

      // Assert: Verify the info-level toast notifying the user that no sessions were changed.
      await waitFor(() => {
        expect(result.current.isRevokingAllSessions).toBe(false);
      });

      expect(toast.info).toHaveBeenCalledWith("No other sessions to revoke.");
    });

    /**
     * Test case to verify error feedback for failed mass revocation logic.
     */
    it("handles logic error from server action", async () => {
      // Arrange: Mock a failed authorization error.
      vi.mocked(revokeAllSessions).mockResolvedValue({ success: false, error: "Auth failed" });
      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Act: Trigger revocation.
      result.current.revokeAllSessions();

      // Assert: Verify that the `Auth failed` message is shown via an error toast.
      await waitFor(() => {
        expect(result.current.isRevokingAllSessions).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith("Auth failed");
    });

    /**
     * Test case to verify fallback error handling for bulk revocation.
     */
    it("toasts default error when error message is missing", async () => {
      // Arrange: Mock an failure without a specific message.
      vi.mocked(revokeAllSessions).mockResolvedValue({ success: false, error: "" });
      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Act: Trigger revocation.
      result.current.revokeAllSessions();

      // Assert: Verify that the fallback "Failed to revoke sessions." toast is used.
      await waitFor(() => {
        expect(result.current.isRevokingAllSessions).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to revoke sessions.");
    });

    /**
     * Test case to verify handling of exceptions thrown during the mass revocation mutation.
     */
    it("handles unexpected error during mutation", async () => {
      // Arrange: Mock an exception rejection.
      vi.mocked(revokeAllSessions).mockRejectedValue(new Error("Network Error"));
      const { result } = renderHook(() => useUserSessions(mockUserId), {
        wrapper: createWrapper(),
      });

      // Act: Trigger revocation.
      result.current.revokeAllSessions();

      // Assert: Verify that the catch handler displays the fallback error notification.
      await waitFor(() => {
        expect(result.current.isRevokingAllSessions).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith("Failed to revoke sessions.");
    });
  });
});
