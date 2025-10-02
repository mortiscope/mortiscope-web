import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DetectionPanelContent } from "@/features/annotation/components/detection-panel-content";
import { useDetectionPanel } from "@/features/annotation/hooks/use-detection-panel";

// Mock the detection panel hook to provide manual control over the active detection state.
vi.mock("@/features/annotation/hooks/use-detection-panel", () => ({
  useDetectionPanel: vi.fn(),
}));

// Mock the sub-component selector to verify label changes without rendering complex dropdown logic.
vi.mock("@/features/annotation/components/detection-panel-selector", () => ({
  DetectionPanelSelector: ({
    onLabelChange,
    selectedLabel,
  }: {
    onLabelChange: (label: string) => void;
    selectedLabel: string;
  }) => (
    <div data-testid="detection-panel-selector">
      <span data-testid="selected-label">{selectedLabel}</span>
      <button onClick={() => onLabelChange("new_label")}>Change Label</button>
    </div>
  ),
}));

// Mock utility functions to ensure consistent text formatting for confidence scores.
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    formatConfidence: (val: number | null) => (val === null ? "N/A" : `${val * 100}%`),
  };
});

/**
 * Test suite for the `DetectionPanelContent` component.
 */
describe("DetectionPanelContent", () => {
  // Mock function spies to track user interactions within the panel.
  const mockHandleLabelChange = vi.fn();
  const mockHandleVerify = vi.fn();
  const mockHandleDelete = vi.fn();

  // Default detection object used to initialize standard test states.
  const defaultDetection = {
    id: "1",
    label: "instar_1",
    confidence: 0.85,
    status: "model_generated",
  };

  // Reset all mock call counts before the execution of each test case.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the component returns null when no detection is selected for display.
   */
  it("renders nothing when there is no displayed detection", () => {
    // Arrange: Mock the hook to return a null detection state.
    vi.mocked(useDetectionPanel).mockReturnValue({
      displayedDetection: null,
      handleLabelChange: mockHandleLabelChange,
      handleVerify: mockHandleVerify,
      handleDelete: mockHandleDelete,
    } as unknown as ReturnType<typeof useDetectionPanel>);

    // Assert: Check that the rendered container is empty.
    const { container } = render(<DetectionPanelContent />);
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to verify UI elements and styling for detections that have not yet been reviewed.
   */
  it("renders correctly for an unverified detection", () => {
    // Arrange: Mock the hook to return a standard unverified detection.
    vi.mocked(useDetectionPanel).mockReturnValue({
      displayedDetection: defaultDetection,
      handleLabelChange: mockHandleLabelChange,
      handleVerify: mockHandleVerify,
      handleDelete: mockHandleDelete,
    } as unknown as ReturnType<typeof useDetectionPanel>);

    render(<DetectionPanelContent />);

    // Assert: Verify visibility of confidence scores and specific unverified styling.
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();

    const statusElement = screen.getByText("Unverified");
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveClass("text-amber-200");

    // Assert: Ensure both action buttons and the label selector are available.
    expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByTestId("detection-panel-selector")).toBeInTheDocument();
  });

  /**
   * Test case to verify UI changes and restricted actions for detections marked as confirmed.
   */
  it("renders correctly for a verified detection", () => {
    // Arrange: Mock the hook to return a detection with a confirmed status.
    vi.mocked(useDetectionPanel).mockReturnValue({
      displayedDetection: {
        ...defaultDetection,
        status: "user_confirmed",
      },
      handleLabelChange: mockHandleLabelChange,
      handleVerify: mockHandleVerify,
      handleDelete: mockHandleDelete,
    } as unknown as ReturnType<typeof useDetectionPanel>);

    render(<DetectionPanelContent />);

    // Assert: Verify label changes and status-specific styling for verified items.
    expect(screen.getByText("Reviewed")).toBeInTheDocument();

    const statusElement = screen.getByText("Verified");
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveClass("text-teal-200");

    // Assert: Verify that the verify button is removed and the delete button expands.
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();

    const deleteButton = screen.getByRole("button", { name: "Delete" });
    expect(deleteButton).toBeInTheDocument();
    expect(deleteButton).toHaveClass("col-span-2");
  });

  /**
   * Test case to verify that clicking the verify button triggers the appropriate logic.
   */
  it("calls handleVerify when Verify button is clicked", () => {
    // Arrange: Render the panel with the verify action available.
    vi.mocked(useDetectionPanel).mockReturnValue({
      displayedDetection: defaultDetection,
      handleLabelChange: mockHandleLabelChange,
      handleVerify: mockHandleVerify,
      handleDelete: mockHandleDelete,
    } as unknown as ReturnType<typeof useDetectionPanel>);

    render(<DetectionPanelContent />);

    // Act: Simulate a user click on the Verify button.
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    // Assert: Verify the verification callback was executed.
    expect(mockHandleVerify).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that clicking the delete button triggers the removal logic.
   */
  it("calls handleDelete when Delete button is clicked", () => {
    // Arrange: Render the panel.
    vi.mocked(useDetectionPanel).mockReturnValue({
      displayedDetection: defaultDetection,
      handleLabelChange: mockHandleLabelChange,
      handleVerify: mockHandleVerify,
      handleDelete: mockHandleDelete,
    } as unknown as ReturnType<typeof useDetectionPanel>);

    render(<DetectionPanelContent />);

    // Act: Simulate a user click on the Delete button.
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    // Assert: Verify the deletion callback was executed.
    expect(mockHandleDelete).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that selecting a new label updates the detection metadata.
   */
  it("calls handleLabelChange when selector triggers a change", () => {
    // Arrange: Render the panel with the mocked selector.
    vi.mocked(useDetectionPanel).mockReturnValue({
      displayedDetection: defaultDetection,
      handleLabelChange: mockHandleLabelChange,
      handleVerify: mockHandleVerify,
      handleDelete: mockHandleDelete,
    } as unknown as ReturnType<typeof useDetectionPanel>);

    render(<DetectionPanelContent />);

    // Act: Simulate a label change from the sub-component.
    fireEvent.click(screen.getByText("Change Label"));

    // Assert: Verify the label change callback was called with the correct payload.
    expect(mockHandleLabelChange).toHaveBeenCalledTimes(1);
    expect(mockHandleLabelChange).toHaveBeenCalledWith("new_label");
  });

  /**
   * Test case to verify that the confidence label changes to 'Reviewed' when numerical data is unavailable.
   */
  it("renders 'Reviewed' confidence if confidence is null", () => {
    // Arrange: Mock a detection where the confidence score is explicitly null.
    vi.mocked(useDetectionPanel).mockReturnValue({
      displayedDetection: { ...defaultDetection, confidence: null },
      handleLabelChange: mockHandleLabelChange,
      handleVerify: mockHandleVerify,
      handleDelete: mockHandleDelete,
    } as unknown as ReturnType<typeof useDetectionPanel>);

    render(<DetectionPanelContent />);

    // Assert: Check that the UI reflects that the item has been reviewed instead of showing a score.
    expect(screen.getByText("Reviewed")).toBeInTheDocument();
  });
});
