import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyzeReview } from "@/features/analyze/components/analyze-review";
import { useAnalyzeReview } from "@/features/cases/hooks/use-analyze-review";

// Mock the custom hook to isolate the component from business logic.
vi.mock("@/features/cases/hooks/use-analyze-review");

// Mock authentication utilities to prevent side effects.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database connection to prevent side effects.
vi.mock("@/db", () => ({
  db: {},
}));

// Mock Framer Motion to render standard HTML elements for easier testing.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className: string }) => (
      <div className={className} data-testid="motion-div">
        {children}
      </div>
    ),
  },
}));

// Mock child components to focus on the parent component's logic and layout.
vi.mock("@/features/cases/components/review-actions", () => ({
  ReviewActions: ({
    onSubmit,
    onCancel,
    onPrevious,
  }: {
    onSubmit: () => void;
    onCancel: () => void;
    onPrevious: () => void;
  }) => (
    <div data-testid="review-actions">
      <button onClick={onSubmit}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onPrevious}>Previous</button>
    </div>
  ),
}));

vi.mock("@/features/cases/components/review-details-summary", () => ({
  ReviewDetailsSummary: (props: { caseName: string; temperatureDisplay: string }) => (
    <div data-testid="review-details-summary">
      {props.caseName} - {props.temperatureDisplay}
    </div>
  ),
}));

vi.mock("@/features/cases/components/review-header", () => ({
  ReviewHeader: () => <div data-testid="review-header">Header</div>,
}));

vi.mock("@/features/cases/components/review-image-summary", () => ({
  ReviewImageSummary: ({ onImageClick }: { onImageClick: (id: string) => void }) => (
    <div data-testid="review-image-summary">
      <button onClick={() => onImageClick("image-1")}>Open Image</button>
    </div>
  ),
}));

vi.mock("@/features/cases/components/review-processing-overlay", () => ({
  ReviewProcessingOverlay: ({ message }: { message: string }) => (
    <div data-testid="review-processing-overlay">{message}</div>
  ),
}));

vi.mock("@/features/upload/components/upload-preview-modal", () => ({
  UploadPreviewModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="upload-preview-modal">Modal Open</div> : null,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div className={className}>{children}</div>
  ),
}));

type AnalyzeReviewHookReturn = ReturnType<typeof useAnalyzeReview>;
type UploadFile = AnalyzeReviewHookReturn["sortedFiles"][number];

/**
 * Groups related tests for the Analyze Review component which handles the final review step before submission.
 */
describe("AnalyzeReview", () => {
  // Mock functions for hook handlers.
  const mockHandleSubmit = vi.fn();
  const mockHandleCancel = vi.fn();
  const mockPrevStep = vi.fn();
  const mockGetPreviewUrl = vi.fn();
  const mockModalOpen = vi.fn();
  const mockModalClose = vi.fn();
  const mockModalNext = vi.fn();
  const mockModalPrevious = vi.fn();
  const mockModalSelectById = vi.fn();

  // Define a mock file object for testing data display.
  const mockFile = {
    id: "image-1",
    key: "image-1.jpg",
    url: "http://example.com/image-1.jpg",
    name: "image-1.jpg",
    size: 1024,
    type: "image/jpeg",
    status: "success",
    progress: 100,
    width: 100,
    height: 100,
    createdAt: new Date(),
    preview: "blob:http://example.com/image-1.jpg",
  } as unknown as UploadFile;

  // Define default return values for the custom hook.
  const defaultMockValues: AnalyzeReviewHookReturn = {
    isProcessing: false,
    isCancelling: false,
    isSubmitting: false,
    isPending: false,
    processingMessage: "Processing...",
    displayData: {
      caseName: "Test Case",
      temperatureDisplay: "25°C",
      caseDateDisplay: "Jan 1, 2025",
      locationDisplay: "Test City",
    },
    sortedFiles: [mockFile],
    modalController: {
      isOpen: false,
      close: mockModalClose,
      selectedItem: null,
      next: mockModalNext,
      previous: mockModalPrevious,
      selectById: mockModalSelectById,
      open: mockModalOpen,
    },
    handleSubmit: mockHandleSubmit,
    handleCancel: mockHandleCancel,
    prevStep: mockPrevStep,
    getPreviewUrl: mockGetPreviewUrl,
  };

  // Reset all mocks and configure the default hook behavior before each test to ensure a clean state.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAnalyzeReview).mockReturnValue(defaultMockValues);
  });

  /**
   * Test case to verify that all main structural components of the review page are rendered.
   */
  it("renders the review page structure correctly", () => {
    // Arrange: Render the `AnalyzeReview` component.
    render(<AnalyzeReview />);

    // Assert: Verify the presence of header, summary, details, and action components.
    expect(screen.getByTestId("motion-div")).toBeInTheDocument();
    expect(screen.getByTestId("review-header")).toBeInTheDocument();
    expect(screen.getByTestId("review-image-summary")).toBeInTheDocument();
    expect(screen.getByTestId("review-details-summary")).toBeInTheDocument();
    expect(screen.getByTestId("review-actions")).toBeInTheDocument();
    // Assert: Ensure the processing overlay is hidden by default.
    expect(screen.queryByTestId("review-processing-overlay")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the case metadata is correctly passed to and displayed by the summary component.
   */
  it("displays case details correctly in the summary component", () => {
    // Arrange: Render the `AnalyzeReview` component.
    render(<AnalyzeReview />);

    // Assert: Check if the summary component text matches the mocked display data.
    const summary = screen.getByTestId("review-details-summary");
    expect(summary).toHaveTextContent("Test Case");
    expect(summary).toHaveTextContent("25°C");
  });

  /**
   * Test case to verify that the processing overlay appears when the submission state is active.
   */
  it("shows the processing overlay when isProcessing is true", () => {
    // Arrange: Override the hook mock to simulate processing state.
    vi.mocked(useAnalyzeReview).mockReturnValue({
      ...defaultMockValues,
      isProcessing: true,
      processingMessage: "Analyzing images...",
    });

    render(<AnalyzeReview />);

    // Assert: Verify that the processing overlay and the correct message are displayed.
    expect(screen.getByTestId("review-processing-overlay")).toBeInTheDocument();
    expect(screen.getByText("Analyzing images...")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the correct event handlers are triggered when user interacts with action buttons.
   */
  it("calls action handlers when buttons are clicked", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<AnalyzeReview />);

    // Act: Simulate clicks on Submit, Cancel, and Previous buttons.
    await user.click(screen.getByText("Submit"));
    expect(mockHandleSubmit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText("Cancel"));
    expect(mockHandleCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText("Previous"));
    expect(mockPrevStep).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the image preview modal is rendered when the modal state indicates it is open.
   */
  it("renders the modal when isOpen is true", () => {
    // Arrange: Override the hook mock to simulate an open modal state.
    vi.mocked(useAnalyzeReview).mockReturnValue({
      ...defaultMockValues,
      modalController: {
        ...defaultMockValues.modalController,
        isOpen: true,
      },
    });

    render(<AnalyzeReview />);
    // Assert: Verify that the modal component is present in the document.
    expect(screen.getByTestId("upload-preview-modal")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking an image thumbnail triggers the modal open action.
   */
  it("triggers modal open when an image is clicked", async () => {
    // Arrange: Setup user event and render the component.
    const user = userEvent.setup();
    render(<AnalyzeReview />);

    // Act: Simulate a click on the "Open Image" button within the summary.
    await user.click(screen.getByText("Open Image"));
    // Assert: Verify that the modal open handler was called with the correct image ID.
    expect(mockModalOpen).toHaveBeenCalledWith("image-1");
  });
});
