import { renderHook, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSessionMonitor } from "@/features/account/hooks/use-session-monitor";

// Mock the Next.js router to intercept and verify navigation calls.
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock the NextAuth session hook to simulate different authentication states.
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

/**
 * Test suite for the `useSessionMonitor` custom hook.
 */
describe("useSessionMonitor", () => {
  const mockReplace = vi.fn();
  const originalFetch = global.fetch;

  // Set up common mocks before each test to ensure a clean testing environment.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useRouter).mockReturnValue({
      replace: mockReplace,
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);

    global.fetch = vi.fn();
  });

  // Restore the original global fetch after each test to prevent side effects in other suites.
  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * Test case to verify that the hook does not trigger navigation when a valid session exists.
   */
  it("initializes without redirecting when authenticated", () => {
    // Arrange: Mock an active and authenticated session state.
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useSessionMonitor());

    // Assert: Check that session state is valid and no redirection occurred.
    expect(result.current.isSessionValid).toBe(true);
    expect(result.current.sessionStatus).toBe("authenticated");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the hook remains idle when starting from an unauthenticated state.
   */
  it("initializes without redirecting when unauthenticated", () => {
    // Arrange: Mock an unauthenticated state.
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useSessionMonitor());

    // Assert: Verify state is invalid but no redirect is triggered.
    expect(result.current.isSessionValid).toBe(false);
    expect(result.current.sessionStatus).toBe("unauthenticated");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a transition from authenticated to unauthenticated triggers a redirect.
   */
  it("redirects on logout when server is reachable", async () => {
    // Arrange: Mock a successful connectivity check.
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);

    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { rerender } = renderHook(() => useSessionMonitor());

    // Act: Simulate a logout by changing the session status to unauthenticated.
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    rerender();

    // Assert: Verify that the router redirected the user to the home page.
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  /**
   * Test case to verify that the hook blocks redirects if the server is unreachable (offline mode).
   */
  it("does not redirect on logout when server is unreachable", async () => {
    // Arrange: Mock a network failure for the connectivity check.
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network Error"));

    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { rerender } = renderHook(() => useSessionMonitor());

    // Act: Transition session status to unauthenticated.
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    rerender();

    // Assert: Verify that fetch was attempted but no redirect was executed due to lack of connectivity.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the redirect logic executes only once even if multiple rerenders occur.
   */
  it("prevents redirect loops", async () => {
    // Arrange: Mock a successful network response.
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);

    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { rerender } = renderHook(() => useSessionMonitor());

    // Act: Simulate logout and multiple rerenders.
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    rerender();

    // Assert: Wait for initial redirect and verify it doesn't repeat on subsequent renders.
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    rerender();

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that a server error status (500) still allows the redirect to proceed.
   */
  it("redirects on logout when server returns non-ok status (500)", async () => {
    // Arrange: Mock a server error response.
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 500 } as Response);

    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { rerender } = renderHook(() => useSessionMonitor());

    // Act: Simulate logout.
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    rerender();

    // Assert: Verify the redirect still triggers because the server was reachable.
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  /**
   * Test case to verify that the "loading" session status is ignored by the monitoring logic.
   */
  it("does not redirect when status is loading", async () => {
    // Arrange: Initial authenticated state.
    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { rerender, result } = renderHook(() => useSessionMonitor());
    expect(result.current.isSessionValid).toBe(true);

    // Act: Change status to loading (e.g., during session refresh).
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    rerender();

    // Assert: Verify no redirection occurs during loading phases.
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.sessionStatus).toBe("loading");
  });

  /**
   * Test case to verify that overlapping asynchronous logout checks are handled safely.
   */
  it("handles concurrent logout checks correctly (race condition safeguard)", async () => {
    // Arrange: Control the fetch promise resolution manually.
    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.mocked(global.fetch).mockReturnValue(fetchPromise);

    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { rerender, unmount } = renderHook(() => useSessionMonitor());

    // Act: Simulate logout and rapid rerenders before fetch resolves.
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
    rerender();
    rerender();

    // Resolve the network check.
    resolveFetch!({ ok: true } as Response);

    // Assert: Verify that only one redirect was executed.
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    unmount();
  });

  /**
   * Test case to verify that transitions into an authenticated state update internal state without redirecting.
   */
  it("handles login transition (unauthenticated -> authenticated)", () => {
    // Arrange: Start as unauthenticated.
    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { rerender, result } = renderHook(() => useSessionMonitor());
    expect(result.current.isSessionValid).toBe(false);

    // Act: Simulate a successful login.
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    rerender();

    // Assert: Verify state is now valid and no redirect was erroneously triggered.
    expect(result.current.isSessionValid).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that updates to the existing session data do not trigger redirection.
   */
  it("handles authenticated session updates", () => {
    // Arrange: Initial authenticated state.
    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "Old Name" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { rerender } = renderHook(() => useSessionMonitor());

    // Act: Update user properties within the session.
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", name: "New Name" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    rerender();

    // Assert: Verify redirect is not called on data updates.
    expect(mockReplace).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the monitoring internal state is flagged as finished after a redirect.
   */
  it("stops monitoring after redirecting", async () => {
    // Arrange: Trigger a standard redirect flow.
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);

    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { rerender } = renderHook(() => useSessionMonitor());

    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    rerender();

    // Assert: Wait for redirect and then verify that subsequent renders do not try to redirect again.
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });

    vi.mocked(useRouter).mockReturnValue({
      replace: mockReplace,
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);

    rerender();

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that a missing data object does not trigger logout if the session status is still "authenticated".
   */
  it("does not logout if session lost but status remains authenticated", async () => {
    // Arrange: Render hook in authenticated state.
    const mockUseSession = vi.mocked(useSession);
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1" }, expires: "2025-01-01" },
      status: "authenticated",
      update: vi.fn(),
    });

    const { rerender } = renderHook(() => useSessionMonitor());

    // Act: Simulate a scenario where data is null but status is still reported as authenticated.
    mockUseSession.mockReturnValue({
      data: null,
      status: "authenticated",
      update: vi.fn(),
    } as unknown as ReturnType<typeof useSession>);

    rerender();

    // Wait for internal microtasks.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Assert: Verify no redirect occurred.
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
