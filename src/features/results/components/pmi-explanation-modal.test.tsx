import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PmiExplanationModal } from "@/features/results/components/pmi-explanation-modal";
import { formatPmiToInterpretableString } from "@/lib/utils";

// Mock framer-motion to bypass animation delays and focus on content rendering.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock utility functions to control the formatting of the PMI string in tests.
vi.mock("@/lib/utils", () => ({
  cn: (...inputs: string[]) => inputs.join(" "),
  formatPmiToInterpretableString: vi.fn(),
}));

// Define a standard mock analysis result representing a successful PMI estimation.
const mockAnalysisResult = {
  caseId: "case-123",
  status: "completed" as const,
  pmiDays: 2.5,
  pmiHours: 60,
  pmiMinutes: 3600,
  explanation: "Test explanation text.",
  totalCounts: null,
  oldestStageDetected: null,
  pmiSourceImageKey: null,
  stageUsedForCalculation: null,
  temperatureProvided: null,
  calculatedAdh: null,
  ldtUsed: null,
  updatedAt: new Date(),
};

/**
 * Test suite for the `PmiExplanationModal` component.
 */
describe("PmiExplanationModal", () => {
  /**
   * Test case to ensure the component remains hidden if no analysis data is available.
   */
  it("renders nothing when analysisResult is null", () => {
    // Arrange: Render the modal with a null `analysisResult`.
    render(
      <PmiExplanationModal
        analysisResult={null}
        isOpen={true}
        onOpenChange={vi.fn()}
        hasEstimation={true}
      />
    );

    // Assert: Check that the modal header is not present in the document.
    expect(screen.queryByText("PMI Explanation")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the modal renders correctly when provided with valid data and an open state.
   */
  it("renders the modal content when open and analysisResult is provided", () => {
    // Arrange: Mock the utility string and render the open modal.
    vi.mocked(formatPmiToInterpretableString).mockReturnValue("2 days and 12 hours");

    render(
      <PmiExplanationModal
        analysisResult={mockAnalysisResult}
        isOpen={true}
        onOpenChange={vi.fn()}
        hasEstimation={true}
      />
    );

    // Assert: Verify the presence of the header and introductory description.
    expect(screen.getByRole("heading", { name: "PMI Explanation" })).toBeInTheDocument();
    expect(
      screen.getByText("A detailed breakdown of the Post-Mortem Interval estimation.")
    ).toBeInTheDocument();
  });

  /**
   * Test case to verify the visibility and accuracy of the summary and raw calculated values.
   */
  it("displays summary and calculated values when hasEstimation is true", () => {
    // Arrange: Mock the interpretable string.
    vi.mocked(formatPmiToInterpretableString).mockReturnValue("2 days and 12 hours");

    render(
      <PmiExplanationModal
        analysisResult={mockAnalysisResult}
        isOpen={true}
        onOpenChange={vi.fn()}
        hasEstimation={true}
      />
    );

    // Assert: Check for summary section heading and the formatted readable PMI string.
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText(/The estimated minimum PMI is approximately/)).toBeInTheDocument();
    expect(screen.getByText("2 days and 12 hours")).toBeInTheDocument();

    // Assert: Check for raw calculated values including days, hours, and minutes with fixed decimals.
    expect(screen.getByText("Calculated Values")).toBeInTheDocument();
    expect(screen.getByText("PMI in Days")).toBeInTheDocument();
    expect(screen.getByText("2.50")).toBeInTheDocument();
    expect(screen.getByText("PMI in Hours")).toBeInTheDocument();
    expect(screen.getByText("60.00")).toBeInTheDocument();
    expect(screen.getByText("PMI in Minutes")).toBeInTheDocument();
    expect(screen.getByText("3600.00")).toBeInTheDocument();
  });

  /**
   * Test case to verify that mathematical breakdowns are hidden when an estimation is not possible.
   */
  it("hides summary and calculated values when hasEstimation is false", () => {
    // Arrange: Render the modal with `hasEstimation` set to false.
    render(
      <PmiExplanationModal
        analysisResult={mockAnalysisResult}
        isOpen={true}
        onOpenChange={vi.fn()}
        hasEstimation={false}
      />
    );

    // Assert: Confirm that technical breakdown sections are not visible to the user.
    expect(screen.queryByText("Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Calculated Values")).not.toBeInTheDocument();
    expect(screen.queryByText("PMI in Days")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the core explanation text from the analysis is displayed.
   */
  it("displays the explanation text", () => {
    // Arrange: Render the modal.
    render(
      <PmiExplanationModal
        analysisResult={mockAnalysisResult}
        isOpen={true}
        onOpenChange={vi.fn()}
        hasEstimation={true}
      />
    );

    // Assert: Check for the explanation section title and the specific `explanation` content.
    expect(screen.getByText("Explanation")).toBeInTheDocument();
    expect(screen.getByText("Test explanation text.")).toBeInTheDocument();
  });

  /**
   * Test case to verify fallback behavior when the analysis is missing an explanation field.
   */
  it("displays fallback text when explanation is missing", () => {
    // Arrange: Create a result object with a null explanation.
    const resultWithoutExplanation = { ...mockAnalysisResult, explanation: null };

    render(
      <PmiExplanationModal
        analysisResult={resultWithoutExplanation}
        isOpen={true}
        onOpenChange={vi.fn()}
        hasEstimation={true}
      />
    );

    // Assert: Verify that a placeholder message is shown instead of an empty space.
    expect(screen.getByText("No explanation provided.")).toBeInTheDocument();
  });

  /**
   * Test case to verify the user acknowledgment interaction and state change.
   */
  it("calls onOpenChange(false) when the 'Got It' button is clicked", async () => {
    // Arrange: Initialize user events and the callback mock.
    const onOpenChange = vi.fn();
    const user = userEvent.setup();

    render(
      <PmiExplanationModal
        analysisResult={mockAnalysisResult}
        isOpen={true}
        onOpenChange={onOpenChange}
        hasEstimation={true}
      />
    );

    // Act: Locate and click the acknowledgment button.
    const button = screen.getByRole("button", { name: /got it/i });
    await user.click(button);

    // Assert: Confirm that the `onOpenChange` handler was called to close the modal.
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  /**
   * Test case to verify that the UI handles missing numeric values without crashing.
   */
  it("handles null numeric values in calculated section gracefully", () => {
    // Arrange: Create a result object with null numeric values.
    const resultWithNulls = {
      ...mockAnalysisResult,
      pmiDays: null,
      pmiHours: null,
      pmiMinutes: null,
    };

    render(
      <PmiExplanationModal
        analysisResult={resultWithNulls}
        isOpen={true}
        onOpenChange={vi.fn()}
        hasEstimation={true}
      />
    );

    // Assert: Verify that "N/A" is displayed for each missing numeric field.
    const nAs = screen.getAllByText("N/A");
    expect(nAs).toHaveLength(3);
  });
});
