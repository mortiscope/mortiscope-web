import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecoveryCodeGrid } from "@/features/account/components/recovery-code-grid";

/**
 * Test suite for the `RecoveryCodeGrid` component.
 */
describe("RecoveryCodeGrid", () => {
  /**
   * Test case to verify that a fixed number of skeleton loaders are displayed during the loading phase.
   */
  it("renders loading skeletons when isLoading is true", () => {
    // Arrange: Render the grid with the `isLoading` prop set to true.
    const { container } = render(<RecoveryCodeGrid displayCodes={[]} isLoading={true} />);

    // Assert: Verify that 16 skeleton elements with the pulse animation class are present in the DOM.
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons).toHaveLength(16);
  });

  /**
   * Test case to verify that recovery codes are correctly displayed when data is loaded.
   */
  it("renders provided codes when isLoading is false", () => {
    // Arrange: Provide a set of string codes and set `isLoading` to false.
    const codes = ["ABCD-1234", "EFGH-5678"];
    render(<RecoveryCodeGrid displayCodes={codes} isLoading={false} />);

    // Assert: Check that the specific code strings are visible in the document.
    expect(screen.getByText("ABCD-1234")).toBeInTheDocument();
    expect(screen.getByText("EFGH-5678")).toBeInTheDocument();
  });

  /**
   * Test case to verify that active (unmasked) codes receive the primary text styling.
   */
  it("applies correct styles for active codes", () => {
    // Arrange: Provide an active recovery code.
    const codes = ["ABCD-1234"];
    render(<RecoveryCodeGrid displayCodes={codes} isLoading={false} />);

    // Assert: Confirm the presence of the `text-slate-700` class and the absence of muted styling.
    const codeElement = screen.getByText("ABCD-1234");
    expect(codeElement).toHaveClass("text-slate-700");
    expect(codeElement).not.toHaveClass("text-slate-500");
  });

  /**
   * Test case to verify that masked or used codes receive muted text styling for visual distinction.
   */
  it("applies correct styles for masked/used codes", () => {
    // Arrange: Provide a masked code string.
    const codes = ["••••-••••"];
    render(<RecoveryCodeGrid displayCodes={codes} isLoading={false} />);

    // Assert: Confirm the presence of the `text-slate-500` muted class and the absence of primary styling.
    const codeElement = screen.getByText("••••-••••");
    expect(codeElement).toHaveClass("text-slate-500");
    expect(codeElement).not.toHaveClass("text-slate-700");
  });

  /**
   * Test case to verify that null or empty values result in a transparent placeholder slot.
   */
  it("renders empty slots correctly", () => {
    // Arrange: Provide a list containing a null value.
    const codes = [null];
    const { container } = render(<RecoveryCodeGrid displayCodes={codes} isLoading={false} />);

    // Assert: Verify that the slot is rendered with transparent text and the expected border color.
    const slot = container.querySelector(".text-transparent");
    expect(slot).toBeInTheDocument();
    expect(slot).toHaveClass("border-slate-100");
  });
});
