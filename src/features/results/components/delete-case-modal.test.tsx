import { useMutation, type UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider, UseMutationOptions } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type getCases } from "@/features/results/actions/get-cases";
import { DeleteCaseModal } from "@/features/results/components/delete-case-modal";

// Type definitions for the mutation result and associated data structures.
type MockedMutationResult<TData, TError, TVariables, TContext> = UseMutationResult<
  TData,
  TError,
  TVariables,
  TContext
>;

type Case = Awaited<ReturnType<typeof getCases>>[number];
type DeleteCaseVariables = { caseId: string; caseName?: string };
type DeleteCaseResult = { success: string } | { error: string };
type MutationContext = { previousCases: Case[] | undefined };

/**
 * Utility function to generate a mock mutation result object with default values and optional overrides.
 */
const createMockMutationResult = <TData, TError, TVariables, TContext>(
  overrides: Partial<MockedMutationResult<TData, TError, TVariables, TContext>>
): MockedMutationResult<TData, TError, TVariables, TContext> =>
  ({
    data: undefined,
    error: null,
    isError: false,
    isIdle: false,
    isPending: false,
    isPaused: false,
    isSuccess: false,
    status: "idle",
    submittedAt: 0,
    failureCount: 0,
    failureReason: null,
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    variables: undefined,
    ...overrides,
  }) as unknown as MockedMutationResult<TData, TError, TVariables, TContext>;

// Mocking React Query hooks to control cache behavior and mutation lifecycle.
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: vi.fn(),
    useQueryClient: vi.fn(),
    QueryClientProvider: actual.QueryClientProvider,
    QueryClient: actual.QueryClient,
  };
});

// Mocking the server action responsible for performing the case deletion.
vi.mock("@/features/results/actions/delete-case", () => ({
  deleteCase: vi.fn(),
}));

// Mocking the toast notification library to verify user feedback.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mocking framer-motion to simplify component hierarchy and bypass animation delays.
vi.mock("framer-motion", () => ({
  motion: {
    div: vi.fn(({ children }) => <div>{children}</div>),
  },
  type: { Variants: {} },
}));

// Mocking the Dialog UI components to verify modal visibility and structure.
vi.mock("@/components/ui/dialog", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/components/ui/dialog")>();
  return {
    ...original,
    Dialog: vi.fn(({ open, children }) => (
      <div data-testid="mock-dialog">{open ? children : null}</div>
    )),
    DialogContent: vi.fn(({ children }) => <div data-testid="dialog-content">{children}</div>),
    DialogHeader: vi.fn(({ children }) => <div>{children}</div>),
    DialogTitle: vi.fn(({ children }) => <h2>{children}</h2>),
    DialogDescription: vi.fn(({ children }) => <p>{children}</p>),
    DialogFooter: vi.fn(({ children }) => <footer>{children}</footer>),
  };
});

// Mocking the Button UI component to ensure event triggers are testable.
vi.mock("@/components/ui/button", () => ({
  Button: vi.fn(({ onClick, disabled, children, ...props }) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )),
}));

// Initializing mock data for a standard case record.
const mockCase: Case = {
  id: "case-delete-123",
  userId: "user-mortiscope-123",
  status: "active",
  caseName: "Test Case Mortiscope",
  temperatureCelsius: 25.5,
  locationRegion: "Region 1",
  locationProvince: "Province 1",
  locationCity: "City 1",
  locationBarangay: "Barangay 1",
  caseDate: new Date("2025-01-20T10:00:00Z"),
  createdAt: new Date("2025-01-19T10:00:00Z"),
  notes: "Sample case notes.",
  uploads: [],
  recalculationNeeded: false,
  verificationStatus: "verified",
  hasDetections: true,
  totalDetections: 5,
  verifiedDetections: 5,
  analysisResult: {
    caseId: "case-delete-123",
    status: "completed",
    totalCounts: null,
    oldestStageDetected: "adult",
    pmiSourceImageKey: "img1",
    pmiDays: 2.5,
    pmiHours: 60,
    pmiMinutes: 3600,
    stageUsedForCalculation: "adult",
    temperatureProvided: 25.5,
    calculatedAdh: 1200,
    ldtUsed: 10,
    explanation: "PMI calculation complete.",
    updatedAt: new Date("2025-10-21T10:00:00Z"),
  },
};

// Initializing a mock list of cases stored in the local cache.
const mockCasesInCache: Case[] = [
  mockCase,
  { ...mockCase, id: "case-delete-456", caseName: "Another Case" },
];

// Defining mock handlers and query client objects for dependency injection.
const mockOnOpenChange = vi.fn();
const mockQueryClient = {
  getQueryData: vi.fn(),
  setQueryData: vi.fn(),
  cancelQueries: vi.fn(() => Promise.resolve()),
  invalidateQueries: vi.fn(),
} as unknown as QueryClient;

/**
 * Helper function to render a component wrapped in a React Query provider.
 */
const renderWithClient = (ui: React.ReactElement) => {
  return render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
};

/**
 * Test suite for the `DeleteCaseModal` component.
 */
describe("DeleteCaseModal", () => {
  // Define default props for the modal component.
  const defaultProps = {
    caseId: mockCase.id,
    caseName: mockCase.caseName,
    isOpen: true,
    onOpenChange: mockOnOpenChange,
  };

  const mockMutate = vi.fn();
  const mockReset = vi.fn();

  // Internal storage for mutation lifecycle callbacks to test logic outside of React rendering.
  let mutationCallbacks: {
    onMutate: UseMutationOptions<
      DeleteCaseResult,
      Error,
      DeleteCaseVariables,
      MutationContext
    >["onMutate"];
    onSuccess: UseMutationOptions<
      DeleteCaseResult,
      Error,
      DeleteCaseVariables,
      MutationContext
    >["onSuccess"];
    onError: UseMutationOptions<
      DeleteCaseResult,
      Error,
      DeleteCaseVariables,
      MutationContext
    >["onError"];
    onSettled: UseMutationOptions<
      DeleteCaseResult,
      Error,
      DeleteCaseVariables,
      MutationContext
    >["onSettled"];
  };

  // Resetting all mocks and configuring the implementation of the `useMutation` hook before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQueryClient).mockReturnValue(mockQueryClient);

    vi.mocked(useMutation).mockImplementation((options) => {
      mutationCallbacks = {
        onMutate: options.onMutate,
        onSuccess: options.onSuccess,
        onError: options.onError,
        onSettled: options.onSettled,
      } as typeof mutationCallbacks;

      return createMockMutationResult<
        DeleteCaseResult,
        Error,
        DeleteCaseVariables,
        MutationContext
      >({
        mutate: mockMutate,
        isPending: false,
        reset: mockReset,
      }) as unknown as UseMutationResult<unknown, unknown, unknown, unknown>;
    });

    vi.mocked(mockQueryClient.getQueryData).mockReturnValue(mockCasesInCache);
  });

  /**
   * Test case to verify that the modal displays the correct title and the specific case name being targeted.
   */
  it("renders the modal title and correct case name when open", () => {
    // Arrange: Render the modal in an open state.
    renderWithClient(<DeleteCaseModal {...defaultProps} />);

    // Assert: Check for the presence of the header, the case name in strong tags, and action buttons.
    expect(screen.getByRole("heading", { name: "Delete Case" })).toBeInTheDocument();
    expect(screen.getByText(defaultProps.caseName!, { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  /**
   * Test case to verify that the cancel interaction correctly triggers the visibility change callback.
   */
  it("calls onOpenChange(false) when Cancel button is clicked", () => {
    // Arrange: Render the modal.
    renderWithClient(<DeleteCaseModal {...defaultProps} />);
    const cancelButton = screen.getByRole("button", { name: /Cancel/i });

    // Act: Simulate a click on the Cancel button.
    fireEvent.click(cancelButton);

    // Assert: Verify that `onOpenChange` was invoked with the value false.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the delete interaction triggers the mutation with the expected parameters.
   */
  it("calls mutate with correct caseId when Delete button is clicked", () => {
    // Arrange: Render the modal.
    renderWithClient(<DeleteCaseModal {...defaultProps} />);
    const deleteButton = screen.getByRole("button", { name: /Delete/i });

    // Act: Simulate a click on the Delete button.
    fireEvent.click(deleteButton);

    // Assert: Verify that the mutation function was called with the target case's metadata.
    expect(mockMutate).toHaveBeenCalledWith({
      caseId: defaultProps.caseId,
      caseName: defaultProps.caseName,
    });
  });

  /**
   * Test case to verify that the delete operation is safely aborted if the `caseId` is missing.
   */
  it("does not call mutate when Delete button is clicked but caseId is null", () => {
    // Arrange: Render the modal with a null identifier.
    renderWithClient(<DeleteCaseModal {...defaultProps} caseId={null} />);
    const deleteButton = screen.getByRole("button", { name: /Delete/i });

    // Act: Simulate a click on the Delete button.
    fireEvent.click(deleteButton);

    // Assert: Verify that the mutation function was never invoked.
    expect(mockMutate).not.toHaveBeenCalled();
  });

  /**
   * Nested test suite to verify the optimistic UI update logic and cache management throughout the mutation lifecycle.
   */
  describe("Mutation Lifecycle (Optimistic Update)", () => {
    // Define the variables passed during the start of the mutation.
    const variables: DeleteCaseVariables = { caseId: mockCase.id, caseName: mockCase.caseName };

    /**
     * Test case to verify that the UI provides immediate feedback by closing the modal before the server responds.
     */
    it("should close the modal immediately onMutate", async () => {
      // Act: Trigger the `onMutate` lifecycle hook.
      await mutationCallbacks.onMutate?.(variables);

      // Assert: Verify immediate closure of the modal.
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    /**
     * Test case to verify that the local cache is updated immediately to reflect the deletion.
     */
    it("should perform optimistic removal from cache onMutate", async () => {
      // Act: Trigger the `onMutate` lifecycle hook.
      const context = (await mutationCallbacks.onMutate?.(variables)) as MutationContext;

      // Assert: Verify that existing queries are cancelled and the previous state is captured in context.
      expect(mockQueryClient.cancelQueries).toHaveBeenCalledWith({ queryKey: ["cases"] });
      expect(context.previousCases).toEqual(mockCasesInCache);

      // Assert: Verify that the query data is updated via a functional setter.
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(["cases"], expect.any(Function));

      // Assert: Execute the setter function and verify only the non-deleted case remains.
      const setter = vi.mocked(mockQueryClient.setQueryData).mock.calls[0][1] as (
        oldCases: Case[] | undefined
      ) => Case[];
      const newCases = setter(mockCasesInCache);

      expect(newCases.length).toBe(1);
      expect(newCases[0]?.id).toBe("case-delete-456");
    });

    /**
     * Test case to verify successful completion behavior, including user notification and cache invalidation.
     */
    it("should show success toast and run onSettled on successful deletion", async () => {
      // Arrange: Simulate the start of the mutation.
      mutationCallbacks.onMutate?.(variables);

      // Act: Simulate a successful server response.
      await mutationCallbacks.onSuccess?.(
        { success: "Case deleted successfully." },
        variables,
        {} as unknown as MutationContext
      );

      // Assert: Verify that a success toast was displayed.
      expect(toast.success).toHaveBeenCalledWith("Case deleted successfully.");

      // Act: Simulate the final lifecycle stage.
      mutationCallbacks.onSettled?.(
        { success: "Case deleted successfully." },
        null,
        variables,
        {} as unknown as MutationContext
      );

      // Assert: Verify that relevant query keys are invalidated to trigger background re-fetching.
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(5);
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["cases"] });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["dashboard-cases"],
      });
    });

    /**
     * Test case to verify that success feedback is suppressed if the server returns an explicit error object.
     */
    it("does not show success toast if response does not contain success message", async () => {
      // Act: Simulate a successful mutation call that returned an error payload.
      await mutationCallbacks.onSuccess?.(
        { error: "Something went wrong" },
        variables,
        {} as unknown as MutationContext
      );

      // Assert: Verify that no success notification was shown.
      expect(toast.success).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that the UI state is rolled back and an error notification is shown upon server failure.
     */
    it("should rollback cache and show error toast on failure", async () => {
      // Arrange: Prepare a mock context containing the previous state.
      const mockContext: MutationContext = { previousCases: mockCasesInCache };

      // Act: Simulate a network failure during the mutation.
      await mutationCallbacks.onError?.(new Error("Network failed"), variables, mockContext);

      // Assert: Verify that the cache was restored and an error message was displayed.
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(["cases"], mockCasesInCache);
      expect(toast.error).toHaveBeenCalledWith("Deletion failed. The case has been restored.");

      // Act: Finalize the lifecycle.
      mutationCallbacks.onSettled?.(
        { error: "Network failed" },
        new Error("Network failed"),
        variables,
        mockContext
      );

      // Assert: Verify that cache invalidation still occurs to ensure consistency.
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(5);
    });

    /**
     * Test case to verify that rollback logic is skipped if the capture context is missing.
     */
    it("does not rollback cache on error if context is missing", async () => {
      // Act: Simulate an error where the context object is undefined.
      await mutationCallbacks.onError?.(
        new Error("Network failed"),
        variables,
        undefined as unknown as MutationContext
      );

      // Assert: Verify that no attempt was made to manually revert the cache data.
      expect(mockQueryClient.setQueryData).toHaveBeenCalledTimes(0);
      expect(toast.error).toHaveBeenCalledWith("Deletion failed. The case has been restored.");
    });
  });

  /**
   * Test case to verify that the UI enters a disabled, pending state during the active deletion request.
   */
  it("shows pending state on Delete button when isPending is true", () => {
    // Arrange: Mock the mutation hook to return a pending status.
    vi.mocked(useMutation).mockReturnValue(
      createMockMutationResult<DeleteCaseResult, Error, DeleteCaseVariables, MutationContext>({
        mutate: mockMutate,
        isPending: true,
        status: "pending",
        reset: mockReset,
      }) as unknown as UseMutationResult<unknown, unknown, unknown, unknown>
    );

    // Act: Render the modal.
    renderWithClient(<DeleteCaseModal {...defaultProps} />);
    const deleteButton = screen.getByRole("button", { name: /Deleting.../i });

    // Assert: Verify the button text changes, an animation is present, and controls are disabled.
    expect(deleteButton).toBeDisabled();
    expect(deleteButton.querySelector("svg")).toHaveClass("animate-spin");
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeDisabled();
  });
});
