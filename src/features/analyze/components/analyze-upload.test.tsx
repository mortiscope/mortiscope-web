import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalyzeUpload } from "@/features/analyze/components/analyze-upload";

// Mock the child component to isolate the test environment for `AnalyzeUpload`.
vi.mock("@/features/cases/components/case-upload", () => ({
  CaseUpload: () => <div data-testid="mock-case-upload">Mock Case Upload</div>,
}));

/**
 * Groups related tests for the Analyze Upload component.
 */
describe("AnalyzeUpload", () => {
  /**
   * Test case to verify that the `CaseUpload` component is rendered within the parent.
   */
  it("renders the CaseUpload component", () => {
    // Arrange: Render the `AnalyzeUpload` component.
    render(<AnalyzeUpload />);

    // Assert: Check if the mocked upload component is present in the document.
    const uploadElement = screen.getByTestId("mock-case-upload");
    expect(uploadElement).toBeInTheDocument();
    expect(uploadElement).toHaveTextContent("Mock Case Upload");
  });
});
