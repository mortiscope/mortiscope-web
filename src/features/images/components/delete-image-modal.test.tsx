import React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "@/__tests__/setup/test-utils";
import { deleteImage } from "@/features/images/actions/delete-image";
import { DeleteImageModal } from "@/features/images/components/delete-image-modal";
import { useResultsStore } from "@/features/results/store/results-store";

// Mock the server action for deleting images to prevent network requests.
vi.mock("@/features/images/actions/delete-image", () => ({
  deleteImage: vi.fn(),
}));

// Mock the global results store to verify state updates.
vi.mock("@/features/results/store/results-store", () => ({
  useResultsStore: vi.fn(),
}));

// Mock the toast library to verify notification triggers.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the Dialog components to simplify DOM rendering and avoid Radix UI complexity in tests.
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
      <div data-testid="dialog-root">
        <button data-testid="dialog-close-trigger" onClick={() => onOpenChange(false)}>
          Close Dialog
        </button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the Button component to render a simple HTML button.
vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button">) => <button {...props}>{props.children}</button>,
}));

// Mock Framer Motion to bypass animations during testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock Next.js navigation hooks to provide route parameters.
vi.mock("next/navigation", () => ({
  useParams: () => ({ resultsId: "case-123" }),
}));

const defaultProps = {
  imageId: "img-1",
  imageName: "test-image.jpg",
  isOpen: true,
  onOpenChange: vi.fn(),
  totalImages: 5,
};

/**
 * Test suite for the `DeleteImageModal` component covering rendering, user interactions, and async states.
 */
describe("DeleteImageModal", () => {
  // Mock function to track if the store's recalculation method is called.
  const markForRecalculationMock = vi.fn();

  // Reset mocks and configure the store hook before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useResultsStore).mockReturnValue({
      markForRecalculation: markForRecalculationMock,
    } as unknown as ReturnType<typeof useResultsStore>);
  });

  /**
   * Test case to verify that the modal does not render when `isOpen` is false.
   */
  it("renders nothing when isOpen is false", () => {
    // Arrange: Render the component with the open state set to false.
    render(<DeleteImageModal {...defaultProps} isOpen={false} />);
    // Assert: Verify that the dialog root element is not present in the DOM.
    expect(screen.queryByTestId("dialog-root")).toBeNull();
  });

  /**
   * Test case to verify that the modal renders the correct content when open.
   */
  it("renders correctly when open", () => {
    // Arrange: Render the component with the default open state.
    render(<DeleteImageModal {...defaultProps} />);

    // Assert: Check for the presence of the header, image name, and buttons.
    expect(screen.getByText("Delete Image")).toBeInTheDocument();
    expect(screen.getByText("test-image.jpg")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  /**
   * Test case to verify that deletion is prevented if only one image remains.
   */
  it("prevents deletion if only 1 image remains", () => {
    // Arrange: Render the component with `totalImages` set to 1.
    render(<DeleteImageModal {...defaultProps} totalImages={1} />);

    // Act: Attempt to click the delete button.
    const deleteBtn = screen.getByText("Delete");
    fireEvent.click(deleteBtn);

    // Assert: Verify that the delete action was not called and an error toast was shown.
    expect(deleteImage).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("must have at least one image")
    );
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the `deleteImage` mutation is called with correct arguments.
   */
  it("calls deleteImage mutation on click", async () => {
    // Arrange: Mock the delete action to resolve successfully.
    vi.mocked(deleteImage).mockResolvedValue({ success: "Deleted successfully" });

    render(<DeleteImageModal {...defaultProps} />);

    // Act: Click the delete button.
    const deleteBtn = screen.getByText("Delete");
    fireEvent.click(deleteBtn);

    // Assert: Verify that the mock function was called with the specific image ID and name.
    await waitFor(() => {
      expect(deleteImage).toHaveBeenCalledWith({
        imageId: "img-1",
        imageName: "test-image.jpg",
      });
    });
  });

  /**
   * Test case to verify behavior upon successful deletion.
   */
  it("handles successful deletion", async () => {
    // Arrange: Mock the delete action to return a success message.
    vi.mocked(deleteImage).mockResolvedValue({ success: "Deleted successfully" });

    render(<DeleteImageModal {...defaultProps} />);

    // Act: Click the delete button.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Verify success toast, store update, and modal closure.
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Deleted successfully");
      expect(markForRecalculationMock).toHaveBeenCalledWith("case-123");
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  /**
   * Test case to verify behavior when the server returns an error.
   */
  it("handles deletion errors from server", async () => {
    // Arrange: Mock the delete action to return an error object.
    vi.mocked(deleteImage).mockResolvedValue({ error: "Server error" });

    render(<DeleteImageModal {...defaultProps} />);

    // Act: Click the delete button.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Verify error toast is displayed and modal closes.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Server error");
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  /**
   * Test case to verify behavior when an unexpected promise rejection occurs.
   */
  it("handles unexpected errors (promise rejection)", async () => {
    // Arrange: Mock the delete action to throw an error.
    vi.mocked(deleteImage).mockRejectedValue(new Error("Network fail"));

    render(<DeleteImageModal {...defaultProps} />);

    // Act: Click the delete button.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Verify generic error toast is displayed and modal closes.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("unexpected error"));
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  /**
   * Test case to verify that UI elements are disabled while the deletion is pending.
   */
  it("disables buttons while deleting", async () => {
    // Arrange: Create a controlled promise to simulate a pending state.
    let resolvePromise!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(deleteImage).mockReturnValue(
      pendingPromise as unknown as ReturnType<typeof deleteImage>
    );

    render(<DeleteImageModal {...defaultProps} />);

    // Act: Click the delete button.
    const deleteBtn = screen.getByText("Delete");
    fireEvent.click(deleteBtn);

    // Assert: Check that buttons are disabled and loading text is shown.
    await waitFor(() => {
      expect(screen.getByText("Deleting...")).toBeInTheDocument();
      expect(deleteBtn).toBeDisabled();
      expect(screen.getByText("Cancel")).toBeDisabled();
    });

    // Resolve the promise to clean up the test.
    resolvePromise({ success: true });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  /**
   * Test case to verify that the Cancel button closes the modal.
   */
  it("closes when Cancel button is clicked", () => {
    // Arrange: Render the component.
    render(<DeleteImageModal {...defaultProps} />);
    // Act: Click the Cancel button.
    fireEvent.click(screen.getByText("Cancel"));
    // Assert: Verify the close callback was triggered.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the Dialog close trigger closes the modal.
   */
  it("closes when Dialog trigger is clicked", () => {
    // Arrange: Render the component.
    render(<DeleteImageModal {...defaultProps} />);
    // Act: Click the mock dialog close trigger.
    fireEvent.click(screen.getByTestId("dialog-close-trigger"));
    // Assert: Verify the close callback was triggered.
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the modal cannot be closed while deletion is in progress.
   */
  it("prevents closing (via Dialog trigger) while deleting", async () => {
    // Arrange: Setup a pending promise to simulate loading.
    let resolvePromise!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(deleteImage).mockReturnValue(
      pendingPromise as unknown as ReturnType<typeof deleteImage>
    );

    render(<DeleteImageModal {...defaultProps} />);

    // Act: Initiate deletion and then try to close the dialog.
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => expect(screen.getByText("Deleting...")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("dialog-close-trigger"));

    // Assert: Verify that the close callback was not triggered.
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();

    // Resolve the promise to clean up.
    resolvePromise({ success: true });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  /**
   * Test case to verify that the component handles unmounting or closing gracefully during async operations.
   */
  it("renders null directly if deletion was initiated and modal is closed", async () => {
    // Arrange: Mock success and render the component.
    vi.mocked(deleteImage).mockResolvedValue({ success: "Deleted" });
    const { rerender } = render(<DeleteImageModal {...defaultProps} />);

    // Act: Initiate deletion and wait for completion.
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());

    // Act: Rerender the component with `isOpen` set to false.
    rerender(<DeleteImageModal {...defaultProps} isOpen={false} />);

    // Assert: Verify that the dialog is no longer in the DOM.
    expect(screen.queryByTestId("dialog-root")).toBeNull();
  });
});
