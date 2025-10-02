import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DetailsAnnotationPanel } from "@/features/annotation/components/details-annotation-panel";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import {
  type AnnotationState,
  useAnnotationStore,
} from "@/features/annotation/store/annotation-store";

// Mock the editor image hook to control loading states during component rendering.
vi.mock("@/features/annotation/hooks/use-editor-image", () => ({
  useEditorImage: vi.fn(),
}));

// Mock the annotation store to simulate different detection states and counts.
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn(),
}));

// Mock the `BeatLoader` component to simplify the testing of the loading overlay.
vi.mock("react-spinners/BeatLoader", () => ({
  default: () => <div data-testid="beat-loader">Loading...</div>,
}));

// Mock the `PanelListItem` to verify that correct labels and numeric values are passed to sub-components.
vi.mock("@/features/annotation/components/panel-list-item", () => ({
  PanelListItem: ({ label, value }: { label: string; value: number }) => (
    <div data-testid="panel-list-item" data-label={label} data-value={value}>
      {label}: {value}
    </div>
  ),
}));

// Mock the `PanelSectionHeader` to verify the categorical grouping of annotation stats.
vi.mock("@/features/annotation/components/panel-section-header", () => ({
  PanelSectionHeader: ({ title }: { title: string }) => (
    <div data-testid="panel-section-header">{title}</div>
  ),
}));

/**
 * Test suite for the `DetailsAnnotationPanel` component.
 */
describe("DetailsAnnotationPanel", () => {
  // Clear mocks and establish default non-loading state with empty detections before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEditorImage).mockReturnValue({
      isLoading: false,
    } as unknown as ReturnType<typeof useEditorImage>);
    vi.mocked(useAnnotationStore).mockImplementation((selector) => {
      const state = { detections: [] } as unknown as AnnotationState;
      return typeof selector === "function" ? selector(state) : state;
    });
  });

  /**
   * Test case to verify that a loading indicator is displayed while the image data is being fetched.
   */
  it("renders the loading state when isLoading is true", () => {
    // Arrange: Force the hook to return a loading state.
    vi.mocked(useEditorImage).mockReturnValue({
      isLoading: true,
    } as unknown as ReturnType<typeof useEditorImage>);

    render(<DetailsAnnotationPanel />);

    // Assert: Verify the loader is visible and the actual data sections are hidden.
    expect(screen.getByTestId("beat-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("panel-section-header")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the three primary statistical categories are rendered correctly.
   */
  it("renders all sections (Detections, Unverified, Verified) when not loading", () => {
    // Arrange: Component uses default non-loading state from `beforeEach`.
    render(<DetailsAnnotationPanel />);

    // Assert: Check for the presence and titles of the section headers.
    const headers = screen.getAllByTestId("panel-section-header");
    expect(headers).toHaveLength(3);
    expect(headers[0]).toHaveTextContent("Detections");
    expect(headers[1]).toHaveTextContent("Unverified");
    expect(headers[2]).toHaveTextContent("Verified");
  });

  /**
   * Test case to verify the complex counting logic for different labels and verification statuses.
   */
  it("correctly counts and displays detection stats", () => {
    // Arrange: Mock a set of detections with varying labels and statuses.
    const mockDetections = [
      { id: "1", label: "instar_1", status: "model_generated" },
      { id: "2", label: "instar_1", status: "user_created" },
      { id: "3", label: "instar_1", status: "user_confirmed" },
      { id: "4", label: "adult", status: "user_edited_confirmed" },
      { id: "5", label: "pupa", status: "model_generated" },
    ];

    vi.mocked(useAnnotationStore).mockImplementation((selector) => {
      const state = { detections: mockDetections } as unknown as AnnotationState;
      return typeof selector === "function" ? selector(state) : state;
    });

    render(<DetailsAnnotationPanel />);

    // Helper: Extract numeric values from rendered list items by label text.
    const checkValue = (labelText: string) => {
      const items = screen.getAllByTestId("panel-list-item");
      const matchedItems = items.filter((item) => item.textContent?.startsWith(labelText));
      return matchedItems.map((item) => Number(item.getAttribute("data-value")));
    };

    // Assert: Verify counts for "First Instar" across (Total, Unverified, Verified).
    const instar1Values = checkValue("First Instar");
    expect(instar1Values[0]).toBe(3);
    expect(instar1Values[1]).toBe(2);
    expect(instar1Values[2]).toBe(1);

    // Assert: Verify counts for "Adult Flies" across (Total, Unverified, Verified).
    const adultValues = checkValue("Adult Flies");
    expect(adultValues[0]).toBe(1);
    expect(adultValues[1]).toBe(0);
    expect(adultValues[2]).toBe(1);

    // Assert: Verify counts for "Pupa" across (Total, Unverified, Verified).
    const pupaValues = checkValue("Pupa");
    expect(pupaValues[0]).toBe(1);
    expect(pupaValues[1]).toBe(1);
    expect(pupaValues[2]).toBe(0);
  });

  /**
   * Test case to ensure the component renders zero counts instead of breaking when no detections exist.
   */
  it("handles empty detections gracefully (all zeros)", () => {
    // Arrange: Default state contains an empty `detections` array.
    render(<DetailsAnnotationPanel />);

    // Assert: Confirm every statistical item displays zero.
    const items = screen.getAllByTestId("panel-list-item");
    items.forEach((item) => {
      expect(item).toHaveAttribute("data-value", "0");
    });
  });

  /**
   * Test case to verify that labels not defined in the standard map are ignored by the counters.
   */
  it("handles unknown labels gracefully (ignores them in counters)", () => {
    // Arrange: Mock a detection with a label that does not exist in the known labels map.
    const mockDetections = [{ id: "1", label: "unknown_bug", status: "model_generated" }];

    vi.mocked(useAnnotationStore).mockImplementation((selector) => {
      const state = { detections: mockDetections } as unknown as AnnotationState;
      return typeof selector === "function" ? selector(state) : state;
    });

    render(<DetailsAnnotationPanel />);

    // Assert: Confirm that the unknown label did not increment any visible stat counters.
    const items = screen.getAllByTestId("panel-list-item");
    items.forEach((item) => {
      expect(item).toHaveAttribute("data-value", "0");
    });
  });
});
