import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";

// Define hoisted mock functions to allow referencing them inside vi.mock factory.
const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  usePathname: vi.fn(),
}));

// Mock NextAuth hook to control session state during tests.
vi.mock("next-auth/react", () => ({
  useSession: mocks.useSession,
}));

// Mock Next.js navigation hook to simulate route changes.
vi.mock("next/navigation", () => ({
  usePathname: mocks.usePathname,
}));

/**
 * Test suite for the useAuthState custom hook.
 */
describe("useAuthState Hook", () => {
  // Set up default mock behaviors and fake timers before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mocks.useSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });
    mocks.usePathname.mockReturnValue("/");
  });

  // Clean up timers after each test to ensure isolation.
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  /**
   * Test case to verify that the hook reports loading state when the session is initializing.
   */
  it("returns isLoading as true when session status is loading", () => {
    // Arrange: Mock the session status to loading.
    mocks.useSession.mockReturnValue({
      data: null,
      status: "loading",
    });

    // Act: Render the hook.
    const { result } = renderHook(() => useAuthState());

    // Assert: Check if isLoading is true and other states are false.
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isUnauthenticated).toBe(false);
  });

  /**
   * Test case to verify that the hook reports authenticated state when a user session exists.
   */
  it("returns isAuthenticated as true when session exists and status is authenticated", () => {
    // Arrange: Mock a valid user session.
    const mockUser = { name: "Mortiscope Account", email: "mortiscope@example.com" };
    mocks.useSession.mockReturnValue({
      data: { user: mockUser },
      status: "authenticated",
    });

    // Act: Render the hook.
    const { result } = renderHook(() => useAuthState());

    // Assert: Check if isAuthenticated is true and user data is returned.
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toEqual(mockUser);
  });

  /**
   * Test case to verify that the hook reports unauthenticated state when no session exists.
   */
  it("returns isUnauthenticated as true when status is unauthenticated", () => {
    // Arrange: Mock the session status to unauthenticated.
    mocks.useSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    // Act: Render the hook.
    const { result } = renderHook(() => useAuthState());

    // Assert: Check if isUnauthenticated is true.
    expect(result.current.isUnauthenticated).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  /**
   * Test case to verify that the hook enters a navigating state when the pathname changes.
   */
  it("triggers navigation state when pathname changes", () => {
    // Arrange: Set up initial authenticated state and pathname.
    mocks.useSession.mockReturnValue({
      data: { user: { name: "User" } },
      status: "authenticated",
    });
    mocks.usePathname.mockReturnValue("/page-1");

    // Act: Render the hook initially.
    const { result, rerender } = renderHook(() => useAuthState());

    // Assert: Verify that navigation state is initially false.
    expect(result.current.isNavigating).toBe(false);

    // Act: Update the pathname mock and rerender to simulate navigation.
    mocks.usePathname.mockReturnValue("/page-2");
    rerender();

    // Assert: Verify that isNavigating and isLoading are active immediately after route change.
    expect(result.current.isNavigating).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);

    // Act: Advance timers to simulate the completion of the navigation delay.
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Assert: Verify that navigation state resets to authenticated.
    expect(result.current.isNavigating).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });

  /**
   * Test case to verify that navigation state resets shortly after session status resolves.
   */
  it("resets navigation state shortly after session status resolves", () => {
    // Arrange: Initialize with a loading state.
    mocks.useSession.mockReturnValue({
      data: null,
      status: "loading",
    });

    // Act: Render the hook.
    const { result, rerender } = renderHook(() => useAuthState());

    // Act: Update session to authenticated and rerender.
    mocks.useSession.mockReturnValue({
      data: { user: { name: "User" } },
      status: "authenticated",
    });
    rerender();

    // Act: Advance timers slightly to allow state updates.
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Assert: Verify isNavigating is false after the update.
    expect(result.current.isNavigating).toBe(false);
  });
});
