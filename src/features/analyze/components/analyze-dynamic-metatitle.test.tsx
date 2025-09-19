import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyzeDynamicMetatitle } from "@/features/analyze/components/analyze-dynamic-metatitle";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

// Mock the state management hook to control the analysis status during tests.
vi.mock("@/features/analyze/store/analyze-store", () => ({
  useAnalyzeStore: vi.fn(),
}));

// Mock the progress indicator component to verify step tracking.
vi.mock("@/features/analyze/components/analyze-progress", () => ({
  AnalyzeProgress: ({ currentStep }: { currentStep: number }) => (
    <div data-testid="mock-analyze-progress" data-step={currentStep}>
      Progress Step: {currentStep}
    </div>
  ),
  analysisSteps: [
    { id: 1, status: "details" },
    { id: 2, status: "upload" },
    { id: 3, status: "review" },
    { id: 5, status: "overflow" },
  ],
}));

// Mock the wizard container to simplify the rendering tree.
vi.mock("@/features/analyze/components/analyze-wizard", () => ({
  AnalyzeWizard: () => <div data-testid="mock-analyze-wizard">Wizard Content</div>,
}));

// Mock UI card components to avoid rendering complex nested structures.
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/**
 * Groups related tests for the AnalyzeDynamicMetatitle component which handles page titles and progress.
 */
describe("AnalyzeDynamicMetatitle", () => {
  // Capture the original document title to restore it after tests.
  const originalTitle = document.title;

  // Reset mocks and set a baseline title before each test execution.
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = "MortiScope";
  });

  // Restore the original document title after each test to ensure isolation.
  afterEach(() => {
    document.title = originalTitle;
  });

  /**
   * Test case to verify that the core wizard components are rendered.
   */
  it("renders the wizard structure components", () => {
    // Arrange: Mock the store status to 'details' and render the component.
    vi.mocked(useAnalyzeStore).mockReturnValue("details");
    render(<AnalyzeDynamicMetatitle />);

    // Assert: Check if the progress indicator and wizard content are present in the document.
    expect(screen.getByTestId("mock-analyze-progress")).toBeInTheDocument();
    expect(screen.getByTestId("mock-analyze-wizard")).toBeInTheDocument();
  });

  /**
   * Test case to verify correct title and progress for the 'details' step.
   */
  it("updates title and progress for 'details' step", () => {
    // Arrange: Mock the store status to 'details' and render the component.
    vi.mocked(useAnalyzeStore).mockReturnValue("details");
    render(<AnalyzeDynamicMetatitle />);

    // Assert: Verify the document title matches the 'details' step and the progress step is 1.
    expect(document.title).toBe("Analyze — Analysis Details • MortiScope");
    expect(screen.getByTestId("mock-analyze-progress")).toHaveAttribute("data-step", "1");
  });

  /**
   * Test case to verify correct title and progress for the 'upload' step.
   */
  it("updates title and progress for 'upload' step", () => {
    // Arrange: Mock the store status to 'upload' and render the component.
    vi.mocked(useAnalyzeStore).mockReturnValue("upload");
    render(<AnalyzeDynamicMetatitle />);

    // Assert: Verify the document title matches the 'upload' step and the progress step is 2.
    expect(document.title).toBe("Analyze — Provide an Image • MortiScope");
    expect(screen.getByTestId("mock-analyze-progress")).toHaveAttribute("data-step", "2");
  });

  /**
   * Test case to verify correct title and progress for the 'review' step.
   */
  it("updates title and progress for 'review' step", () => {
    // Arrange: Mock the store status to 'review' and render the component.
    vi.mocked(useAnalyzeStore).mockReturnValue("review");
    render(<AnalyzeDynamicMetatitle />);

    // Assert: Verify the document title matches the 'review' step and the progress step is 3.
    expect(document.title).toBe("Analyze — Review and Submit • MortiScope");
    expect(screen.getByTestId("mock-analyze-progress")).toHaveAttribute("data-step", "3");
  });

  /**
   * Test case to verify correct title and progress for the 'processing' step.
   */
  it("updates title and progress for 'processing' step", () => {
    // Arrange: Mock the store status to 'processing' and render the component.
    vi.mocked(useAnalyzeStore).mockReturnValue("processing");
    render(<AnalyzeDynamicMetatitle />);

    // Assert: Verify the document title matches the 'processing' step and the progress step is 4.
    expect(document.title).toBe("Analyze — Processing • MortiScope");
    expect(screen.getByTestId("mock-analyze-progress")).toHaveAttribute("data-step", "4");
  });

  /**
   * Test case to verify that a fallback title is used when the step index exceeds standard titles.
   */
  it("uses fallback title for out-of-bounds step", () => {
    // Arrange: Mock the store status to 'overflow' and render the component.
    vi.mocked(useAnalyzeStore).mockReturnValue("overflow");
    render(<AnalyzeDynamicMetatitle />);

    // Assert: Verify the document title uses the generic fallback and the progress step is 5.
    expect(document.title).toBe("Analyze — Analyze • MortiScope");
    expect(screen.getByTestId("mock-analyze-progress")).toHaveAttribute("data-step", "5");
  });

  /**
   * Test case to verify that the component defaults to step 1 for unknown statuses.
   */
  it("defaults to step 1 for unknown status", () => {
    // Arrange: Mock the store status to an unknown value and render the component.
    vi.mocked(useAnalyzeStore).mockReturnValue("unknown-status");
    render(<AnalyzeDynamicMetatitle />);

    // Assert: Verify the document title defaults to the 'details' step and the progress step is 1.
    expect(document.title).toBe("Analyze — Analysis Details • MortiScope");
    expect(screen.getByTestId("mock-analyze-progress")).toHaveAttribute("data-step", "1");
  });

  /**
   * Test case to verify that the document title is reset when the component unmounts.
   */
  it("resets document title on unmount", () => {
    // Arrange: Mock the store status to 'details', render, and capture the unmount function.
    vi.mocked(useAnalyzeStore).mockReturnValue("details");
    const { unmount } = render(<AnalyzeDynamicMetatitle />);

    // Assert: Verify the title was updated during render.
    expect(document.title).toBe("Analyze — Analysis Details • MortiScope");

    // Act: Unmount the component.
    unmount();

    // Assert: Verify the document title reverts to the baseline.
    expect(document.title).toBe("MortiScope");
  });
});
