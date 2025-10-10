import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type SessionContextValue, useSession as useNextAuthSession } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderHook, waitFor } from "@/__tests__/setup/test-utils";
import {
  getCurrentSession,
  type UserSessionInfo,
} from "@/features/account/actions/get-current-session";
import {
  useIsCurrentSession,
  useSession,
  useSessionToken,
} from "@/features/account/hooks/use-session";

// Mock the NextAuth session hook to control authentication state during tests.
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock the server action responsible for retrieving extended session metadata.
vi.mock("@/features/account/actions/get-current-session", () => ({
  getCurrentSession: vi.fn(),
}));

/**
 * Helper function to provide a React Query context for hooks that perform data fetching.
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return TestWrapper;
};

/**
 * Test suite for the `useSession` hooks.
 */
describe("useSession Hook Suite", () => {
  // Reset all mock call histories before each test to maintain execution isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Group of tests focusing on the primary useSession hook.
   */
  describe("useSession", () => {
    /**
     * Test case to verify that the loading state is active when NextAuth is initializing.
     */
    it("returns loading state when NextAuth is loading", () => {
      // Arrange: Set the NextAuth status to loading.
      vi.mocked(useNextAuthSession).mockReturnValue({
        data: null,
        status: "loading",
        update: vi.fn(),
      });

      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

      // Assert: Verify that loading flags are correctly set and authentication is false.
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isFullyLoaded).toBe(false);
    });

    /**
     * Test case to verify the hook's behavior when the user is explicitly signed out.
     */
    it("returns unauthenticated state correctly", () => {
      // Arrange: Set the NextAuth status to unauthenticated.
      vi.mocked(useNextAuthSession).mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

      // Assert: Verify that session data and metadata are absent.
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.session).toBeNull();
      expect(result.current.sessionInfo).toBeUndefined();
    });

    /**
     * Test case to verify that authenticated users trigger a secondary fetch for rich session metadata.
     */
    it("fetches rich session info when authenticated", async () => {
      // Arrange: Define mock authentication and session metadata.
      const mockAuthSession = {
        user: { id: "user-123", name: "Test User" },
        expires: "2025-01-01",
      };
      const mockSessionInfo = {
        id: "session-1",
        deviceType: "Desktop",
        ipAddress: "127.0.0.1",
      };

      vi.mocked(useNextAuthSession).mockReturnValue({
        data: mockAuthSession,
        status: "authenticated",
        update: vi.fn(),
      });

      vi.mocked(getCurrentSession).mockResolvedValue(mockSessionInfo as unknown as UserSessionInfo);

      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

      // Assert: Verify initial loading state for the secondary fetch.
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isSessionInfoLoading).toBe(true);

      // Act: Wait for the asynchronous session info fetch to resolve.
      await waitFor(() => {
        expect(result.current.isSessionInfoLoading).toBe(false);
      });

      // Assert: Verify that both NextAuth data and custom session info are merged in the result.
      expect(result.current.session).toEqual(mockAuthSession);
      expect(result.current.sessionInfo).toEqual(mockSessionInfo);
      expect(result.current.isFullyLoaded).toBe(true);
      expect(getCurrentSession).toHaveBeenCalledWith("user-123");
    });

    /**
     * Test case to verify that failures in the secondary session fetch are captured without crashing the hook.
     */
    it("handles error during session info fetch", async () => {
      // Arrange: Mock authenticated status but a failing metadata fetch.
      vi.mocked(useNextAuthSession).mockReturnValue({
        data: { user: { id: "user-123" } },
        status: "authenticated",
        update: vi.fn(),
      } as unknown as SessionContextValue);

      vi.mocked(getCurrentSession).mockRejectedValue(new Error("Fetch failed"));

      const { result } = renderHook(() => useSession(), { wrapper: createWrapper() });

      // Assert: Verify the error state is defined while the hook marks itself as fully loaded.
      await waitFor(() => {
        expect(result.current.sessionInfoError).toBeDefined();
        expect(result.current.isSessionInfoLoading).toBe(false);
      });

      expect(result.current.isFullyLoaded).toBe(true);
      expect(result.current.sessionInfo).toBeUndefined();
    });
  });

  /**
   * Group of tests focusing on the useSessionToken utility hook.
   */
  describe("useSessionToken", () => {
    /**
     * Test case to verify that the hook returns null when no user session exists.
     */
    it("returns null if unauthenticated", () => {
      // Arrange: Set status to unauthenticated.
      vi.mocked(useNextAuthSession).mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      const { result } = renderHook(() => useSessionToken());

      // Assert: Check that the token is null.
      expect(result.current).toBeNull();
    });

    /**
     * Test case to verify that the raw token is extracted from an authenticated session.
     */
    it("returns token if authenticated and present in session", () => {
      // Arrange: Mock a session containing a `sessionToken`.
      vi.mocked(useNextAuthSession).mockReturnValue({
        data: { sessionToken: "token-abc" },
        status: "authenticated",
        update: vi.fn(),
      } as unknown as SessionContextValue);

      const { result } = renderHook(() => useSessionToken());

      // Assert: Verify the extracted token value.
      expect(result.current).toBe("token-abc");
    });

    /**
     * Test case to verify that null is returned if the session data is authenticated but lacks a token field.
     */
    it("returns null if authenticated but token missing", () => {
      // Arrange: Mock an authenticated session without a token property.
      vi.mocked(useNextAuthSession).mockReturnValue({
        data: { user: { id: "1" } },
        status: "authenticated",
        update: vi.fn(),
      } as unknown as SessionContextValue);

      const { result } = renderHook(() => useSessionToken());

      // Assert: Verify the token remains null.
      expect(result.current).toBeNull();
    });
  });

  /**
   * Group of tests focusing on the useIsCurrentSession comparison hook.
   */
  describe("useIsCurrentSession", () => {
    /**
     * Test case to verify that the comparison returns true when the target token matches the active session.
     */
    it("returns true when tokens match", () => {
      // Arrange: Set current session token.
      vi.mocked(useNextAuthSession).mockReturnValue({
        data: { sessionToken: "token-match" },
        status: "authenticated",
        update: vi.fn(),
      } as unknown as SessionContextValue);

      // Act: Compare against the same token.
      const { result } = renderHook(() => useIsCurrentSession("token-match"));

      // Assert: Verify the match is identified.
      expect(result.current).toBe(true);
    });

    /**
     * Test case to verify that the comparison returns false when the tokens differ.
     */
    it("returns false when tokens do not match", () => {
      // Arrange: Set current session token.
      vi.mocked(useNextAuthSession).mockReturnValue({
        data: { sessionToken: "token-current" },
        status: "authenticated",
        update: vi.fn(),
      } as unknown as SessionContextValue);

      // Act: Compare against a different token.
      const { result } = renderHook(() => useIsCurrentSession("token-other"));

      // Assert: Verify the mismatch is identified.
      expect(result.current).toBe(false);
    });

    /**
     * Test case to verify that comparisons always fail if the user is not authenticated.
     */
    it("returns false when user is not authenticated", () => {
      // Arrange: Set status to unauthenticated.
      vi.mocked(useNextAuthSession).mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });

      // Act: Perform the comparison.
      const { result } = renderHook(() => useIsCurrentSession("some-token"));

      // Assert: Verify the result is false.
      expect(result.current).toBe(false);
    });
  });
});
