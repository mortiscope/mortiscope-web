import { useMutation, useQueryClient } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { DeleteSelectedCaseModal } from "@/features/dashboard/components/delete-selected-case-modal";

// Mock the server action for deleting cases to prevent actual API calls.
vi.mock("@/features/dashboard/actions/delete-selected-cases", () => ({
  deleteSelectedCases: vi.fn(),
}));

// Mock TanStack Query hooks to control the mutation lifecycle and cache invalidation.
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
  useMutation: vi.fn(),
}));

// Mock the toast notification library to verify user feedback during success or failure.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock framer-motion to remove animation delays and allow immediate DOM inspection.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

// Mock basic Radix UI Dialog components for structural testing.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="mock-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock account-related UI components used within the dashboard modals.
vi.mock("@/features/account/components/account-modal-header", () => ({
  AccountModalHeader: ({
    title,
    description,
  }: {
    title: string;
    description: string;
    variant?: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock("@/features/account/components/account-modal-footer", () => ({
  AccountModalFooter: ({
    onAction,
    disabled,
    isPending,
    actionButtonText,
    onCancel,
  }: {
    onAction: () => void;
    disabled: boolean;
    isPending: boolean;
    actionButtonText: string;
    variant?: string;
    pendingButtonText?: string;
    onCancel?: () => void;
  }) => (
    <div>
      <button onClick={onCancel} data-testid="cancel-btn">
        Cancel
      </button>
      <button
        data-testid="submit-btn"
        onClick={(e) => {
          e.preventDefault();
          onAction();
        }}
        disabled={disabled}
      >
        {isPending ? "Pending..." : actionButtonText}
      </button>
    </div>
  ),
}));

vi.mock("@/features/account/components/account-password-input", () => {
  const MockInput = React.forwardRef(
    (
      {
        focusColor,
        hasError,
        ...props
      }: React.ComponentProps<"input"> & { focusColor?: string; hasError?: boolean },
      ref: React.Ref<HTMLInputElement>
    ) => {
      void focusColor;
      void hasError;
      return <input data-testid="password-input" {...props} ref={ref} />;
    }
  );
  MockInput.displayName = "AccountPasswordInput";
  return { AccountPasswordInput: MockInput };
});

interface MutationCallbacks {
  onSuccess?: (data: { success?: string; error?: string }) => void;
  onError?: (error: Error) => void;
}

/**
 * Test suite for the `DeleteSelectedCaseModal` component.
 */
describe("DeleteSelectedCaseModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockInvalidateQueries = vi.fn();

  let mutationOptions: MutationCallbacks | undefined;
  const mockMutate = vi.fn();

  const selectedCases = [
    { id: "1", name: "Test Case" },
    { id: "2", name: "Sample Case" },
  ];

  // Setup TanStack Query mocks before each test to capture mutation callbacks.
  beforeEach(() => {
    vi.clearAllMocks();

    (useQueryClient as Mock).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });

    (useMutation as Mock).mockImplementation((options) => {
      mutationOptions = options;
      return {
        mutate: mockMutate,
        isPending: false,
      };
    });
  });

  /**
   * Test case to verify that the modal is not mounted when `isOpen` is false.
   */
  it("does not render when isOpen is false", () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={false}
        onOpenChange={mockOnOpenChange}
        selectedCases={selectedCases}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.queryByTestId("mock-dialog")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal displays the titles of all cases marked for deletion.
   */
  it("renders correctly with selected cases list", () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedCases={selectedCases}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText("Delete Selected Cases")).toBeInTheDocument();
    expect(screen.getByText(/permanently delete 2 cases/)).toBeInTheDocument();
    expect(screen.getByText("Test Case")).toBeInTheDocument();
    expect(screen.getByText("Sample Case")).toBeInTheDocument();
    expect(screen.getByText("Warning:")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the submit button remains disabled until a password is provided.
   */
  it("submit button is disabled initially (until password entered)", () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedCases={selectedCases}
        onSuccess={mockOnSuccess}
      />
    );

    const submitBtn = screen.getByTestId("submit-btn");
    expect(submitBtn).toBeDisabled();
  });

  /**
   * Test case to verify that the submit button enables once the user types into the password field.
   */
  it("enables submit button when password is typed", async () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedCases={selectedCases}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByTestId("password-input");
    fireEvent.change(input, { target: { value: "password123" } });

    await waitFor(() => {
      expect(screen.getByTestId("submit-btn")).not.toBeDisabled();
    });
  });

  /**
   * Test case to verify that the component correctly maps case IDs and the password to the mutation function.
   */
  it("calls mutation on submit", async () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedCases={selectedCases}
        onSuccess={mockOnSuccess}
      />
    );

    const input = screen.getByTestId("password-input");
    fireEvent.change(input, { target: { value: "password123" } });

    await waitFor(() => expect(screen.getByTestId("submit-btn")).not.toBeDisabled());

    fireEvent.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        caseIds: ["1", "2"],
        currentPassword: "password123",
      });
    });
  });

  /**
   * Test case to verify the successful deletion flow: toast notification, cache invalidation, and parent callback.
   */
  it("handles successful deletion", () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedCases={selectedCases}
        onSuccess={mockOnSuccess}
      />
    );

    const successResult = { success: "Cases deleted successfully" };
    if (mutationOptions?.onSuccess) {
      const onSuccess = mutationOptions.onSuccess;
      act(() => {
        onSuccess(successResult);
      });
    }

    expect(toast.success).toHaveBeenCalledWith("Cases deleted successfully", expect.anything());
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard-cases"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["forensic-insights"] });
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  /**
   * Test case to verify that specialized validation errors (like invalid password) are displayed in the UI.
   */
  it("handles password error specifically", async () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedCases={selectedCases}
        onSuccess={mockOnSuccess}
      />
    );

    const errorResult = { error: "Invalid password" };
    if (mutationOptions?.onSuccess) {
      const onSuccess = mutationOptions.onSuccess;
      act(() => {
        onSuccess(errorResult);
      });
    }

    expect(toast.error).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("Invalid password.")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that general server errors trigger a global toast error notification.
   */
  it("handles generic server error", () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedCases={selectedCases}
        onSuccess={mockOnSuccess}
      />
    );

    const errorResult = { error: "Database connection failed" };
    if (mutationOptions?.onSuccess) {
      const onSuccess = mutationOptions.onSuccess;
      act(() => {
        onSuccess(errorResult);
      });
    }

    expect(toast.error).toHaveBeenCalledWith("Database connection failed", expect.anything());
  });

  /**
   * Test case to verify error handling when the mutation execution itself fails (e.g., network timeout).
   */
  it("handles mutation execution error", () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedCases={selectedCases}
        onSuccess={mockOnSuccess}
      />
    );

    if (mutationOptions?.onError) {
      const onError = mutationOptions.onError;
      act(() => {
        onError(new Error("Network Error"));
      });
    }

    expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.", expect.anything());
  });

  /**
   * Test case to verify that canceling the operation triggers the `onOpenChange` handler with `false`.
   */
  it("closes the modal when canceled", async () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedCases={selectedCases}
        onSuccess={mockOnSuccess}
      />
    );

    fireEvent.click(screen.getByTestId("cancel-btn"));
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  /**
   * Test case to verify that the modal wording adjusts correctly when only a single case is selected.
   */
  it("renders correctly with a single selected case (singular wording)", () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedCases={[{ id: "1", name: "Single Case" }]}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/permanently delete 1 case\./)).toBeInTheDocument();
    expect(screen.getByText(/The following case will be deleted:/)).toBeInTheDocument();
    expect(screen.getByText("Single Case")).toBeInTheDocument();
  });

  /**
   * Test case to ensure the component behaves correctly if the mutation returns an unexpected empty result.
   */
  it("handles unknown result outcome (no success, no error)", () => {
    render(
      <DeleteSelectedCaseModal
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        selectedCases={selectedCases}
        onSuccess={mockOnSuccess}
      />
    );

    const unknownResult = {};
    if (mutationOptions?.onSuccess) {
      const onSuccess = mutationOptions.onSuccess;
      act(() => {
        onSuccess(unknownResult);
      });
    }

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
