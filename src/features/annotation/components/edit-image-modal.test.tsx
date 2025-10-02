import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditImageModal } from "@/features/annotation/components/edit-image-modal";

// Mock the main body of the edit modal to track internal state changes and selection logic.
vi.mock("@/features/annotation/components/edit-image-body", () => ({
  EditImageBody: ({
    editOption,
    onEditOptionChange,
  }: {
    editOption: string;
    onEditOptionChange: (option: string) => void;
  }) => (
    <div data-testid="edit-image-body">
      <span data-testid="current-option">{editOption}</span>
      <button onClick={() => onEditOptionChange("new_tab")}>Select New Tab</button>
      <button onClick={() => onEditOptionChange("current_tab")}>Select Current Tab</button>
    </div>
  ),
}));

// Mock the modal footer to provide trigger points for export and cancellation actions.
vi.mock("@/features/export/components/export-modal-footer", () => ({
  ExportModalFooter: ({ onExport, onCancel }: { onExport: () => void; onCancel: () => void }) => (
    <div>
      <button onClick={onExport}>Proceed</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock the modal header to verify that correct titles and image metadata are displayed.
vi.mock("@/features/export/components/export-modal-header", () => ({
  ExportModalHeader: ({ title, description }: { title: string; description: React.ReactNode }) => (
    <div data-testid="modal-header">
      <h1>{title}</h1>
      <div>{description}</div>
    </div>
  ),
}));

// Mock framer-motion components to avoid animation delays and focus on functional rendering.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock the base Dialog components to simulate open/close transitions and visibility.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid="dialog-root">
      {open && children}
      <button data-testid="dialog-close-trigger" onClick={() => onOpenChange(false)}>
        Close Dialog
      </button>
      <button data-testid="dialog-open-trigger" onClick={() => onOpenChange(true)}>
        Open Dialog
      </button>
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
}));

/**
 * Test suite for the `EditImageModal` component.
 */
describe("EditImageModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockRouterPush = vi.fn();
  const mockImage = { id: "img-123", name: "test-image.jpg" };
  const mockResultsId = "res-456";

  // Configure environment and mocks before each individual test case.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockRouterPush,
    });
  });

  // Restore global state and real clock behavior after each test case.
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * Test case to verify that all sub-components and image labels appear when the modal is active.
   */
  it("renders the modal content when open", () => {
    // Arrange: Render the modal with the isOpen prop set to true.
    render(
      <EditImageModal
        image={mockImage}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        resultsId={mockResultsId}
      />
    );

    // Assert: Check for the existence of header, body, footer, and the specific image name.
    expect(screen.getByTestId("modal-header")).toBeInTheDocument();
    expect(screen.getByText("test-image.jpg")).toBeInTheDocument();
    expect(screen.getByTestId("edit-image-body")).toBeInTheDocument();
    expect(screen.getByText("Proceed")).toBeInTheDocument();
  });

  /**
   * Test case to ensure the component initializes with the correct default navigation option.
   */
  it("defaults to 'current_tab' edit option", () => {
    // Arrange: Render the modal.
    render(
      <EditImageModal
        image={mockImage}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        resultsId={mockResultsId}
      />
    );

    // Assert: Verify that the initial state passed to the body is current_tab.
    expect(screen.getByTestId("current-option")).toHaveTextContent("current_tab");
  });

  /**
   * Test case to verify that interaction with the body component updates the internal selection state.
   */
  it("updates edit option state when body component triggers change", () => {
    // Arrange: Render the modal.
    render(
      <EditImageModal
        image={mockImage}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        resultsId={mockResultsId}
      />
    );

    // Act: Simulate a user choosing to open the editor in a new tab.
    fireEvent.click(screen.getByText("Select New Tab"));

    // Assert: Verify that the state update is reflected in the rendered component.
    expect(screen.getByTestId("current-option")).toHaveTextContent("new_tab");
  });

  /**
   * Test case to verify internal routing when the user chooses to stay in the same tab.
   */
  it("navigates via router.push when proceeding with 'current_tab'", () => {
    // Arrange: Render the modal.
    render(
      <EditImageModal
        image={mockImage}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        resultsId={mockResultsId}
      />
    );

    // Act: Click the proceed button with the default current_tab option active.
    fireEvent.click(screen.getByText("Proceed"));

    // Assert: Verify the router is called with the formatted URL and the modal is closed.
    const expectedUrl = `/results/${mockResultsId}/image/${mockImage.id}/edit`;
    expect(mockRouterPush).toHaveBeenCalledWith(expectedUrl);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify window.open is used when the user selects the new tab option.
   */
  it("opens a new window when proceeding with 'new_tab'", () => {
    // Arrange: Spy on the global window.open method.
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <EditImageModal
        image={mockImage}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        resultsId={mockResultsId}
      />
    );

    // Act: Select new tab option and proceed.
    fireEvent.click(screen.getByText("Select New Tab"));
    expect(screen.getByTestId("current-option")).toHaveTextContent("new_tab");
    fireEvent.click(screen.getByText("Proceed"));

    // Assert: Verify window.open was called with the correct target and parameters.
    const expectedUrl = `/results/${mockResultsId}/image/${mockImage.id}/edit`;
    expect(windowOpenSpy).toHaveBeenCalledWith(expectedUrl, "_blank");
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the cancel action triggers the closure of the modal.
   */
  it("closes the modal when cancel is clicked", () => {
    // Arrange: Render the modal.
    render(
      <EditImageModal
        image={mockImage}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        resultsId={mockResultsId}
      />
    );

    // Act: Click the cancel button in the footer.
    fireEvent.click(screen.getByText("Cancel"));

    // Assert: Verify the parent is notified to set isOpen to false.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to prevent navigation or state changes if the image data is missing.
   */
  it("does not navigate if image prop is null", () => {
    // Arrange: Provide a null value for the image prop.
    render(
      <EditImageModal
        image={null}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        resultsId={mockResultsId}
      />
    );

    // Act: Attempt to proceed.
    fireEvent.click(screen.getByText("Proceed"));

    // Assert: Ensure no navigation or closure occurs.
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockOnOpenChange).not.toHaveBeenCalled();
  });

  /**
   * Test case to prevent navigation if the results context is missing.
   */
  it("does not navigate if resultsId prop is missing", () => {
    // Arrange: Provide an undefined value for the resultsId prop.
    render(
      <EditImageModal
        image={mockImage}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        resultsId={undefined}
      />
    );

    // Act: Attempt to proceed.
    fireEvent.click(screen.getByText("Proceed"));

    // Assert: Verify the navigation logic is aborted.
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that local state resets after the modal finish its closing transition.
   */
  it("resets local state to default after closing via action", async () => {
    // Arrange: Render and change the default selection.
    const { rerender } = render(
      <EditImageModal
        image={mockImage}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        resultsId={mockResultsId}
      />
    );

    fireEvent.click(screen.getByText("Select New Tab"));
    expect(screen.getByTestId("current-option")).toHaveTextContent("new_tab");

    // Act: Cancel the modal and fast-forward the timer to simulate the closing delay.
    fireEvent.click(screen.getByText("Cancel"));

    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Re-render: Simulate the modal being opened again.
    rerender(
      <EditImageModal
        image={mockImage}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        resultsId={mockResultsId}
      />
    );

    // Assert: Ensure the internal state has returned to current_tab.
    expect(screen.getByTestId("current-option")).toHaveTextContent("current_tab");
  });

  /**
   * Test case to ensure the state is preserved if the modal is not actually closing.
   */
  it("does not reset local state when onOpenChange is called with true", async () => {
    // Arrange: Render and change the default selection.
    render(
      <EditImageModal
        image={mockImage}
        isOpen={true}
        onOpenChange={mockOnOpenChange}
        resultsId={mockResultsId}
      />
    );

    fireEvent.click(screen.getByText("Select New Tab"));

    // Act: Trigger an open change with true and advance time.
    fireEvent.click(screen.getByTestId("dialog-open-trigger"));

    act(() => {
      vi.advanceTimersByTime(350);
    });

    // Assert: Verify the user selection remains intact.
    expect(screen.getByTestId("current-option")).toHaveTextContent("new_tab");
  });
});
