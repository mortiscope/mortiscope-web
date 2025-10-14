import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RecoveryCodesModal } from "@/features/account/components/recovery-codes-modal";
import { useRecoveryCodes } from "@/features/account/hooks/use-recovery-codes";

// Mock the custom hook to provide recovery code data and action handlers.
vi.mock("@/features/account/hooks/use-recovery-codes", () => ({
  useRecoveryCodes: vi.fn(),
}));

// Mock the modal header to verify that the title and description are correctly propagated.
vi.mock("@/features/account/components/account-modal-header", () => ({
  AccountModalHeader: ({ title, description }: { title: string; description: React.ReactNode }) => (
    <div data-testid="modal-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

// Mock the modal footer to verify button labels and closure callbacks.
vi.mock("@/features/account/components/account-modal-footer", () => ({
  AccountModalFooter: ({ onCancel, onAction }: { onCancel: () => void; onAction: () => void }) => (
    <div data-testid="modal-footer">
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onAction}>Finish</button>
    </div>
  ),
}));

// Mock the action buttons component for copying, downloading, and regenerating codes.
vi.mock("@/features/account/components/recovery-code-actions", () => ({
  RecoveryCodeActions: () => <div data-testid="recovery-actions" />,
}));

// Mock the code grid to verify that the specific recovery codes are displayed.
vi.mock("@/features/account/components/recovery-code-grid", () => ({
  RecoveryCodeGrid: ({ displayCodes }: { displayCodes: string[] }) => (
    <div data-testid="recovery-grid">{displayCodes.join(", ")}</div>
  ),
}));

// Mock the UI Dialog components to provide testable triggers for visibility changes.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="dialog-overlay">
        <button data-testid="close-overlay" onClick={() => onOpenChange(false)} />
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
}));

/**
 * Test suite for the `RecoveryCodesModal` component.
 */
describe("RecoveryCodesModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockHandleCopy = vi.fn();
  const mockHandleDownload = vi.fn();
  const mockHandleRegenerate = vi.fn();

  // Define default values returned by the useRecoveryCodes hook for consistent state testing.
  const defaultHookValues = {
    displayCodes: ["CODE-1", "CODE-2"],
    isLoading: false,
    canCopy: true,
    canDownload: true,
    hasVisibleCodes: true,
    handleCopy: mockHandleCopy,
    handleDownload: mockHandleDownload,
    handleRegenerate: mockHandleRegenerate,
  };

  // Define default props for the modal.
  const defaultProps = {
    isOpen: true,
    onOpenChange: mockOnOpenChange,
  };

  // Reset all mocks and initialize hook return values before each individual test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRecoveryCodes).mockReturnValue(
      defaultHookValues as unknown as ReturnType<typeof useRecoveryCodes>
    );
  });

  /**
   * Test case to verify that the modal and all its sub-components render correctly when the `isOpen` prop is true.
   */
  it("renders correctly when open", () => {
    // Arrange: Render the component in an open state.
    render(<RecoveryCodesModal {...defaultProps} />);

    // Assert: Confirm the presence of the dialog, header, code grid, actions, and footer.
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
    expect(screen.getByTestId("modal-header")).toBeInTheDocument();
    expect(screen.getByTestId("recovery-grid")).toBeInTheDocument();
    expect(screen.getByTestId("recovery-actions")).toBeInTheDocument();
    expect(screen.getByTestId("modal-footer")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal does not render in the DOM when the `isOpen` prop is false.
   */
  it("does not render when closed", () => {
    // Arrange: Render the component with the `isOpen` prop set to false.
    render(<RecoveryCodesModal {...defaultProps} isOpen={false} />);

    // Assert: Verify that the dialog content is not present in the document.
    expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the `useRecoveryCodes` hook is initialized with the correct open state and provided codes.
   */
  it("initializes hook with correct params", () => {
    // Arrange: Define initial codes to be passed to the modal.
    const initialCodes = ["INIT-1"];
    render(<RecoveryCodesModal {...defaultProps} initialCodes={initialCodes} />);

    // Assert: Check that the hook was initialized with the correct parameters.
    expect(useRecoveryCodes).toHaveBeenCalledWith(true, initialCodes);
  });

  /**
   * Test case to verify that the code strings provided by the hook are passed into the grid component.
   */
  it("passes data from hook to child components", () => {
    // Arrange: Render the component.
    render(<RecoveryCodesModal {...defaultProps} />);

    // Assert: Confirm that the grid contains the joined string of codes.
    expect(screen.getByTestId("recovery-grid")).toHaveTextContent("CODE-1, CODE-2");
  });

  /**
   * Test case to verify that the modal displays instructions to save codes when they are currently visible.
   */
  it("shows correct description when codes are visible", () => {
    // Arrange: Render the component with the hook reporting visible codes.
    render(<RecoveryCodesModal {...defaultProps} />);

    // Assert: Confirm the instruction to save codes is visible.
    expect(screen.getByText(/save these recovery codes/i)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal displays security warnings when codes are hidden.
   */
  it("shows correct description when codes are hidden (security mode)", () => {
    // Arrange: Mock the hook to indicate codes are not visible.
    vi.mocked(useRecoveryCodes).mockReturnValue({
      ...defaultHookValues,
      hasVisibleCodes: false,
    } as unknown as ReturnType<typeof useRecoveryCodes>);

    render(<RecoveryCodesModal {...defaultProps} initialCodes={undefined} />);

    // Assert: Confirm the security warning about viewed codes is visible.
    expect(screen.getByText(/recovery codes can only be viewed/i)).toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal closure is triggered by the footer cancel button.
   */
  it("closes modal when clicking 'Cancel' in footer", () => {
    // Arrange: Render the component.
    render(<RecoveryCodesModal {...defaultProps} />);

    // Act: Click the cancel button in the footer.
    fireEvent.click(screen.getByText("Cancel"));

    // Assert: Confirm the `onOpenChange` callback was called with false.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the modal closure is triggered by the footer finish button.
   */
  it("closes modal when clicking 'Finish' in footer", () => {
    // Arrange: Render the component.
    render(<RecoveryCodesModal {...defaultProps} />);

    // Act: Click the finish button in the footer.
    fireEvent.click(screen.getByText("Finish"));

    // Assert: Confirm the `onOpenChange` callback was called with false.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the modal closure is triggered by interacting with the dialog overlay.
   */
  it("closes modal when clicking overlay", () => {
    // Arrange: Render the component.
    render(<RecoveryCodesModal {...defaultProps} />);

    // Act: Click the simulated overlay close button.
    fireEvent.click(screen.getByTestId("close-overlay"));

    // Assert: Confirm the `onOpenChange` callback was called with false.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
