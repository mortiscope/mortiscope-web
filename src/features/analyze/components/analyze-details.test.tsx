import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalyzeDetails } from "@/features/analyze/components/analyze-details";

// Mock the child component to isolate the test environment for `AnalyzeDetails`.
vi.mock("@/features/cases/components/case-details-form", () => ({
  CaseDetailsForm: () => <div data-testid="mock-case-details-form">Mock Case Details Form</div>,
}));

/**
 * Groups related tests for the `AnalyzeDetails` component.
 */
describe("AnalyzeDetails", () => {
  /**
   * Test case to verify that the `CaseDetailsForm` component is rendered within the parent.
   */
  it("renders the CaseDetailsForm component", () => {
    // Arrange: Render the `AnalyzeDetails` component.
    render(<AnalyzeDetails />);

    // Assert: Retrieve the mocked element and verify it exists in the document.
    const formElement = screen.getByTestId("mock-case-details-form");
    expect(formElement).toBeInTheDocument();
    expect(formElement).toHaveTextContent("Mock Case Details Form");
  });
});
