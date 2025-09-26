import * as ReactQuery from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResultsRecalculateModal } from "@/features/results/components/results-recalculate-modal";

// Mock React Query to control mutation states and intercept callback logic.
vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn(),
}));

// Mock the server action to prevent actual network requests during recalculation tests.
vi.mock("@/features/results/actions/request-recalculation", () => ({
  requestRecalculation: vi.fn(),
}));

// Mock framer-motion to bypass animation delays and focus on DOM presence.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock spinner icons to verify loading states in the UI.
vi.mock("react-icons/im", () => ({
  ImSpinner2: () => <span data-testid="icon-spinner" />,
}));

// Mock status and warning icons to verify the informative layout of the modal.
vi.mock("react-icons/pi", () => ({
  PiWarning: () => <span data-testid="icon-warning" />,
  PiSealPercent: () => <span data-testid="icon-seal-percent" />,
  PiSealWarning: () => <span data-testid="icon-seal-warning" />,
}));

// Mock the toast notification system for verifying error and success feedback.
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock Radix-based Dialog components to simplify the modal structure and trigger lifecycle events.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="mock-dialog" data-open={open}>
      <button data-testid="dialog-close-trigger" onClick={() => onOpenChange(false)}>
        Trigger Close
      </button>
      {children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

interface MutationCallbacks {
  onSuccess?: (data: { success: boolean }) => void;
  onError?: () => void;
}

/**
 * Test suite for the `ResultsRecalculateModal` component.
 */
describe("ResultsRecalculateModal", () => {
  const defaultProps = {
    caseId: "case-123",
    isOpen: true,
    onOpenChange: vi.fn(),
    onRecalculationStart: vi.fn(),
    isRecalculating: false,
  };

  const mockMutate = vi.fn();
  let mutationOptions: MutationCallbacks;

  // Reset all mocks and provide a default implementation for useMutation before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(ReactQuery.useMutation).mockImplementation((options: unknown) => {
      mutationOptions = options as MutationCallbacks;
      return {
        mutate: mockMutate,
        isPending: false,
        reset: vi.fn(),
        data: undefined,
        error: null,
        status: "idle",
        variables: undefined,
        context: undefined,
        failureCount: 0,
        failureReason: null,
        isError: false,
        isIdle: true,
        isPaused: false,
        isSuccess: false,
        submittedAt: 0,
      } as unknown as ReactQuery.UseMutationResult<unknown, unknown, unknown, unknown>;
    });
  });

  /**
   * Test case to verify that the modal displays the correct title, warnings, and icons when opened.
   */
  it("renders the modal content correctly when open", () => {
    // Arrange: Render the modal in its open state.
    render(<ResultsRecalculateModal {...defaultProps} />);

    // Assert: Check for specific heading text and warning messages.
    expect(screen.getByRole("heading", { name: "Recalculate PMI" })).toBeInTheDocument();
    expect(screen.getByText(/A value affecting the/)).toBeInTheDocument();
    expect(screen.getByText(/overwrite/)).toBeInTheDocument();
    expect(screen.getByTestId("icon-warning")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `onOpenChange` callback is triggered when the user cancels the action.
   */
  it("calls onOpenChange(false) when Cancel is clicked", async () => {
    // Arrange: Setup user event and render.
    const user = userEvent.setup();
    render(<ResultsRecalculateModal {...defaultProps} />);

    // Act: Click the cancel button.
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    // Assert: Verify the close callback was called.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the recalculation mutation is triggered with the correct `caseId`.
   */
  it("calls mutate with caseId when Recalculate is clicked", async () => {
    // Arrange: Setup user event and render.
    const user = userEvent.setup();
    render(<ResultsRecalculateModal {...defaultProps} />);

    // Act: Click the confirm recalculate button.
    const recalculateButton = screen.getByRole("button", { name: /recalculate/i });
    await user.click(recalculateButton);

    // Assert: Verify the mutation was called with relevant parameters.
    expect(mockMutate).toHaveBeenCalledWith({ caseId: "case-123" });
  });

  /**
   * Test case to ensure the mutation is not triggered if the `caseId` is missing.
   */
  it("does not call mutate if caseId is null", async () => {
    // Arrange: Provide a null `caseId`.
    const user = userEvent.setup();
    render(<ResultsRecalculateModal {...defaultProps} caseId={null} />);

    // Act: Click the recalculate button.
    const recalculateButton = screen.getByRole("button", { name: /recalculate/i });
    await user.click(recalculateButton);

    // Assert: Verify mutation was prevented.
    expect(mockMutate).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify the interface transitions to a disabled loading state during active recalculation.
   */
  it("disables buttons and shows loading state when isRecalculating is true", () => {
    // Arrange: Set `isRecalculating` to true.
    render(<ResultsRecalculateModal {...defaultProps} isRecalculating={true} />);

    // Act: Locate both footer buttons.
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    const recalculateButton = screen.getByRole("button", { name: /recalculating/i });

    // Assert: Check for disabled state and loading indicators.
    expect(cancelButton).toBeDisabled();
    expect(recalculateButton).toBeDisabled();
    expect(screen.getByTestId("icon-spinner")).toBeInTheDocument();
    expect(screen.getByText("Recalculating...")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the success callback is executed when the mutation completes.
   */
  it("calls onRecalculationStart when mutation succeeds", () => {
    // Arrange: Render the modal.
    render(<ResultsRecalculateModal {...defaultProps} />);

    // Act: Manually trigger the `onSuccess` callback from the mutation mock.
    expect(mutationOptions).toBeDefined();
    mutationOptions.onSuccess?.({ success: true });

    // Assert: Verify external state synchronization.
    expect(defaultProps.onRecalculationStart).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the modal closes automatically if the mutation encounters an error.
   */
  it("calls onOpenChange(false) when mutation fails", () => {
    // Arrange: Render the modal.
    render(<ResultsRecalculateModal {...defaultProps} />);

    // Act: Manually trigger the `onError` callback from the mutation mock.
    expect(mutationOptions).toBeDefined();
    mutationOptions.onError?.();

    // Assert: Verify the modal attempts to close.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify the loading state is displayed when the mutation is in a pending status.
   */
  it("shows loading state when mutation is pending", () => {
    // Arrange: Mock `isPending` state for the mutation.
    vi.mocked(ReactQuery.useMutation).mockImplementation(
      () =>
        ({
          mutate: mockMutate,
          isPending: true,
          reset: vi.fn(),
          status: "pending",
        }) as unknown as ReactQuery.UseMutationResult<unknown, unknown, unknown, unknown>
    );

    render(<ResultsRecalculateModal {...defaultProps} />);

    // Assert: Verify button text and spinner presence.
    expect(screen.getByRole("button", { name: /recalculating/i })).toBeDisabled();
    expect(screen.getByTestId("icon-spinner")).toBeInTheDocument();
  });

  /**
   * Test case to verify the modal can close during idle state via the dialog's root triggers.
   */
  it("calls onOpenChange when dialog requests close and not recalculating", async () => {
    // Arrange: Render in standard open state.
    render(<ResultsRecalculateModal {...defaultProps} />);

    // Act: Simulate an external dialog close request.
    const trigger = screen.getByTestId("dialog-close-trigger");
    fireEvent.click(trigger);

    // Assert: Verify close callback.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to prevent closing the modal if a background recalculation is in progress.
   */
  it("does not call onOpenChange when dialog requests close and isRecalculating is true", async () => {
    // Arrange: Render with active `isRecalculating` prop.
    render(<ResultsRecalculateModal {...defaultProps} isRecalculating={true} />);

    // Act: Attempt to close the dialog.
    const trigger = screen.getByTestId("dialog-close-trigger");
    fireEvent.click(trigger);

    // Assert: Verify the close request was ignored to prevent state corruption.
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
  });

  /**
   * Test case to prevent closing the modal if the initial mutation is still pending.
   */
  it("does not call onOpenChange when dialog requests close and mutation is pending", async () => {
    // Arrange: Mock pending mutation state.
    vi.mocked(ReactQuery.useMutation).mockImplementation(
      () =>
        ({
          mutate: mockMutate,
          isPending: true,
          reset: vi.fn(),
          status: "pending",
        }) as unknown as ReactQuery.UseMutationResult<unknown, unknown, unknown, unknown>
    );

    render(<ResultsRecalculateModal {...defaultProps} />);

    // Act: Attempt to close the dialog.
    const trigger = screen.getByTestId("dialog-close-trigger");
    fireEvent.click(trigger);

    // Assert: Verify the close request was prevented.
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
  });
});
