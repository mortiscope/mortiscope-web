import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { EditorDeleteImageModal } from "@/features/annotation/components/editor-delete-image-modal";
import { deleteImage } from "@/features/images/actions/delete-image";
import { useResultsStore } from "@/features/results/store/results-store";

// Mock the server action responsible for deleting images from the database and storage.
vi.mock("@/features/images/actions/delete-image", () => ({
  deleteImage: vi.fn(),
}));

// Mock the results store to track requests for data recalculation after image removal.
vi.mock("@/features/results/store/results-store");

// Mock the base modal container to simplify testing of visibility and open/close states.
vi.mock("@/features/annotation/components/annotation-modal-container", () => ({
  AnnotationModalContainer: ({
    children,
    isOpen,
    onOpenChange,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
  }) =>
    isOpen ? (
      <div data-testid="modal-container">
        <button data-testid="container-close" onClick={() => onOpenChange(false)}>
          Close Container
        </button>
        {children}
      </div>
    ) : null,
}));

// Mock the modal header to verify that the correct title and image information are displayed.
vi.mock("@/features/annotation/components/annotation-modal-header", () => ({
  AnnotationModalHeader: ({
    title,
    description,
  }: {
    title: string;
    description: React.ReactNode;
  }) => (
    <div data-testid="modal-header">
      <h1>{title}</h1>
      <div data-testid="modal-description">{description}</div>
    </div>
  ),
}));

// Mock the modal footer to provide trigger points for confirming or canceling deletion.
vi.mock("@/features/annotation/components/annotation-modal-footer", () => ({
  AnnotationModalFooter: ({
    onConfirm,
    onCancel,
    isPending,
  }: {
    onConfirm: () => void;
    onCancel: () => void;
    isPending: boolean;
  }) => (
    <div data-testid="modal-footer">
      <button onClick={onCancel} disabled={isPending}>
        Cancel
      </button>
      <button onClick={onConfirm} disabled={isPending}>
        Delete
      </button>
      {isPending && <span data-testid="loading-indicator">Deleting...</span>}
    </div>
  ),
}));

/**
 * Test suite for the `EditorDeleteImageModal` component.
 */
describe("EditorDeleteImageModal", () => {
  const mockMarkForRecalculation = vi.fn();
  const mockOnOpenChange = vi.fn();

  const defaultProps = {
    imageId: "img-123",
    imageName: "sample-image.jpg",
    isOpen: true,
    onOpenChange: mockOnOpenChange,
    totalImages: 5,
  };

  // Reset all mocks and provide default route parameters before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useParams).mockReturnValue({ resultsId: "case-123" });
    vi.mocked(useResultsStore).mockReturnValue({
      markForRecalculation: mockMarkForRecalculation,
    } as unknown as ReturnType<typeof useResultsStore>);
  });

  /**
   * Test case to verify that the modal renders the correct text and structure when active.
   */
  it("renders correctly when open", () => {
    // Arrange: Render the modal with default open props.
    render(<EditorDeleteImageModal {...defaultProps} />);

    // Assert: Verify visibility of the container and specific descriptive text.
    expect(screen.getByTestId("modal-container")).toBeInTheDocument();
    expect(screen.getByText("Delete Image")).toBeInTheDocument();
    expect(screen.getByText("sample-image.jpg")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to permanently delete/)).toBeInTheDocument();
  });

  /**
   * Test case to ensure the component returns null and renders nothing when not open.
   */
  it("does not render when isOpen is false", () => {
    // Arrange: Set the `isOpen` prop to false.
    render(<EditorDeleteImageModal {...defaultProps} isOpen={false} />);

    // Assert: Verify the modal container is absent from the DOM.
    expect(screen.queryByTestId("modal-container")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking confirm triggers the deletion server action.
   */
  it("calls deleteImage action on confirm", async () => {
    // Arrange: Mock a successful response from the server action.
    vi.mocked(deleteImage).mockResolvedValue({ success: "Deleted" });

    render(<EditorDeleteImageModal {...defaultProps} />);

    // Act: Click the confirmation button.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Check that the server action was called with correct image metadata.
    await waitFor(() => {
      expect(deleteImage).toHaveBeenCalledWith({
        imageId: "img-123",
        imageName: "sample-image.jpg",
      });
    });

    // Assert: Ensure the modal is closed after the action completes.
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  /**
   * Test case to ensure the results are marked for recalculation after an image is deleted.
   */
  it("marks for recalculation on successful deletion", async () => {
    // Arrange: Mock a successful response from the server action.
    vi.mocked(deleteImage).mockResolvedValue({ success: "Deleted" });

    render(<EditorDeleteImageModal {...defaultProps} />);

    // Act: Trigger the deletion.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Verify the store function is called with the current `resultsId`.
    await waitFor(() => {
      expect(mockMarkForRecalculation).toHaveBeenCalledWith("case-123");
    });
  });

  /**
   * Test case to verify that clicking cancel closes the modal without further action.
   */
  it("closes the modal on cancellation", () => {
    // Arrange: Render the modal.
    render(<EditorDeleteImageModal {...defaultProps} />);

    // Act: Click the cancel button.
    fireEvent.click(screen.getByText("Cancel"));

    // Assert: Verify the close handler is triggered.
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to enforce the business rule preventing deletion of the last remaining image.
   */
  it("prevents deletion if totalImages is <= 1", () => {
    // Arrange: Set the `totalImages` count to 1.
    render(<EditorDeleteImageModal {...defaultProps} totalImages={1} />);

    // Act: Click the delete button.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Verify the action is blocked and the modal is dismissed.
    expect(deleteImage).not.toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify the UI reflects the pending state while a deletion is in progress.
   */
  it("displays loading state while deleting", async () => {
    // Arrange: Create a controlled promise to simulate network latency.
    let resolvePromise: (value: { success?: string; error?: string }) => void;
    const promise = new Promise<{ success?: string; error?: string }>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(deleteImage).mockReturnValue(promise);

    render(<EditorDeleteImageModal {...defaultProps} />);

    // Act: Initiate deletion.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Verify that buttons are disabled and the loading indicator is visible.
    await waitFor(() => {
      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });
    expect(screen.getByText("Delete")).toBeDisabled();

    // Act: Resolve the deletion promise.
    resolvePromise!({ success: "Done" });

    // Assert: Ensure the modal closes upon completion.
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  /**
   * Test case to ensure the user cannot close the modal by clicking outside while a deletion is pending.
   */
  it("prevents closing via container while deleting", async () => {
    // Arrange: Create a controlled promise to maintain a pending state.
    let resolvePromise: (value: { success?: string; error?: string }) => void;
    const promise = new Promise<{ success?: string; error?: string }>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(deleteImage).mockReturnValue(promise);

    render(<EditorDeleteImageModal {...defaultProps} />);

    // Act: Initiate deletion.
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });

    // Act: Attempt to close the modal via the container trigger.
    fireEvent.click(screen.getByTestId("container-close"));

    // Assert: Verify the close request was ignored.
    expect(mockOnOpenChange).not.toHaveBeenCalled();

    // Act: Resolve the operation.
    resolvePromise!({ success: "Done" });

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  /**
   * Test case to ensure the modal closes gracefully even if the server action fails.
   */
  it("handles error gracefully by closing modal", async () => {
    // Arrange: Mock the server action to reject with an error.
    vi.mocked(deleteImage).mockRejectedValue(new Error("Network error"));

    render(<EditorDeleteImageModal {...defaultProps} />);

    // Act: Click delete.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Verify the modal closes regardless of the error.
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  /**
   * Test case to prevent execution if the target image identifier is missing.
   */
  it("does not attempt deletion if imageId is null", () => {
    // Arrange: Provide a null value for `imageId`.
    render(<EditorDeleteImageModal {...defaultProps} imageId={null} />);

    // Act: Attempt deletion.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Verify the server action was not triggered.
    expect(deleteImage).not.toHaveBeenCalled();
  });

  /**
   * Test case to ensure deletion proceeds even if the case context is missing, though recalculation is skipped.
   */
  it("handles caseId being missing (no recalculation)", async () => {
    // Arrange: Mock missing route parameters.
    vi.mocked(useParams).mockReturnValue({ resultsId: undefined });
    vi.mocked(deleteImage).mockResolvedValue({ success: "Deleted" });

    render(<EditorDeleteImageModal {...defaultProps} />);

    // Act: Click delete.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Ensure deletion happened but recalculation was bypassed.
    await waitFor(() => {
      expect(deleteImage).toHaveBeenCalled();
    });

    expect(mockMarkForRecalculation).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  /**
   * Test case to verify that missing image names are normalized to undefined for the server action.
   */
  it("passes undefined for imageName if missing", async () => {
    // Arrange: Provide a null value for `imageName`.
    vi.mocked(deleteImage).mockResolvedValue({ success: "Deleted" });

    render(<EditorDeleteImageModal {...defaultProps} imageName={null} />);

    // Act: Click delete.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Verify the parameter normalization.
    await waitFor(() => {
      expect(deleteImage).toHaveBeenCalledWith({
        imageId: "img-123",
        imageName: undefined,
      });
    });
  });

  /**
   * Test case to ensure recalculation is not triggered if the server action returns an empty success result.
   */
  it("does not invalidate queries if delete returns unsucessful result", async () => {
    // Arrange: Mock a response that does not contain a success message.
    vi.mocked(deleteImage).mockResolvedValue({ success: "" });

    render(<EditorDeleteImageModal {...defaultProps} />);

    // Act: Click delete.
    fireEvent.click(screen.getByText("Delete"));

    // Assert: Verify the modal closes but recalculation is not requested.
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    expect(mockMarkForRecalculation).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify the component handles being unmounted or closed mid-operation safely.
   */
  it("returns null directly when closed after previously initiating deletion", async () => {
    // Arrange: Initiate a successful deletion.
    vi.mocked(deleteImage).mockResolvedValue({ success: "Deleted" });

    const { rerender } = render(<EditorDeleteImageModal {...defaultProps} />);

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(deleteImage).toHaveBeenCalled();
    });

    // Act: Force the modal closed via props.
    rerender(<EditorDeleteImageModal {...defaultProps} isOpen={false} />);

    // Assert: Verify the modal container is removed from the DOM.
    expect(screen.queryByTestId("modal-container")).not.toBeInTheDocument();
  });
});
