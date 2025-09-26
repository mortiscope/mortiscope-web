import { revalidatePath } from "next/cache";
import { Session } from "next-auth";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { requestRecalculation } from "@/features/results/actions/request-recalculation";
import { inngest } from "@/lib/inngest";

// Mock the authentication module to control user session verification.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the Next.js cache utility to verify if the case results page is revalidated.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the Inngest client to intercept event emission.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

/**
 * Test suite for the `requestRecalculation` server action.
 */
describe("requestRecalculation", () => {
  // Clear all mock call histories before each test case to maintain test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that unauthenticated requests are rejected with a specific error.
   */
  it("returns error when user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return null, simulating a logged-out state.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Act: Invoke the action with a valid `caseId`.
    const result = await requestRecalculation({ caseId: "case-123" });

    // Assert: Check that the unauthorized error is returned and no event is sent to Inngest.
    expect(result).toEqual({ error: "Unauthorized: You must be logged in." });
    expect(inngest.send).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a session lacking a user identifier is treated as unauthorized.
   */
  it("returns error when session exists but has no user ID", async () => {
    // Arrange: Mock an active session that contains an empty user object.
    (auth as unknown as Mock).mockResolvedValue({ user: {} } as Session);

    // Act: Attempt to request a recalculation.
    const result = await requestRecalculation({ caseId: "case-123" });

    // Assert: Verify that the missing `id` property triggers the unauthorized rejection.
    expect(result).toEqual({ error: "Unauthorized: You must be logged in." });
    expect(inngest.send).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify the successful workflow for triggering a recalculation event.
   */
  it("successfully triggers recalculation event and revalidates path", async () => {
    // Arrange: Mock a valid authenticated session with a user ID.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    // Act: Invoke the recalculation request for the specified `caseId`.
    const result = await requestRecalculation({ caseId: "case-123" });

    // Assert: Check that the correct Inngest event was emitted with the expected payload.
    expect(inngest.send).toHaveBeenCalledWith({
      name: "recalculation/case.requested",
      data: { caseId: "case-123" },
    });

    // Assert: Verify that the cache for the specific case results page was revalidated.
    expect(revalidatePath).toHaveBeenCalledWith("/results/case-123");
    expect(result).toEqual({ success: "Recalculation has been started." });
  });

  /**
   * Test case to verify that exceptions during event emission are handled and logged.
   */
  it("handles unexpected errors and logs them", async () => {
    // Arrange: Mock a valid session and force the Inngest client to throw an error.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    const error = new Error("Inngest failure");
    (inngest.send as Mock).mockRejectedValue(error);

    // Arrange: Spy on the console to verify that the failure details are logged.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Invoke the action which will encounter the rejected promise.
    const result = await requestRecalculation({ caseId: "case-123" });

    // Assert: Verify that a generic error message is returned to the user and the system logs the original error.
    expect(result).toEqual({
      error: "An unexpected error occurred while starting the recalculation.",
    });
    expect(consoleSpy).toHaveBeenCalledWith("Failed to send recalculation request:", error);

    // Restore the console spy to its original state.
    consoleSpy.mockRestore();
  });
});
