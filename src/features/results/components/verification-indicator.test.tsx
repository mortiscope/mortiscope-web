import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { VerificationIndicator } from "@/features/results/components/verification-indicator";

// Mock the UI Badge component to verify the conditional rendering of status labels and percentage text.
vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    className: string;
    "aria-label": string;
  }) => (
    <div data-testid="badge" className={className} aria-label={ariaLabel}>
      {children}
    </div>
  ),
}));

// Mock Tooltip components to ensure accessibility and content visibility for various verification states.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock status configurations to verify that the component correctly maps backend statuses to visual labels and icons.
vi.mock("@/lib/constants", () => ({
  STATUS_CONFIG: {
    verified: {
      label: "Verified",
      icon: (props: React.ComponentProps<"svg">) => <svg data-testid="icon-verified" {...props} />,
      color: "text-emerald-500",
    },
    in_progress: {
      label: "In Progress",
      icon: (props: React.ComponentProps<"svg">) => <svg data-testid="icon-progress" {...props} />,
      color: "text-sky-500",
    },
    unverified: {
      label: "Unverified",
      icon: (props: React.ComponentProps<"svg">) => (
        <svg data-testid="icon-unverified" {...props} />
      ),
      color: "text-amber-500",
    },
    no_detections: {
      label: "No Detections",
      icon: (props: React.ComponentProps<"svg">) => <svg data-testid="icon-warning" {...props} />,
      color: "text-rose-500",
    },
  },
}));

/**
 * Test suite for the `VerificationIndicator` component.
 */
describe("VerificationIndicator", () => {
  /**
   * Test case to verify that the "verified" status renders its specific icon and tooltip without a badge.
   */
  it("renders the correct icon and label for verified status", () => {
    // Arrange: Render the indicator with a completed verification status.
    render(<VerificationIndicator verificationStatus="verified" />);

    // Assert: Verify the presence of the verified icon and the matching tooltip text.
    expect(screen.getByTestId("icon-verified")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Verified");
    expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the "unverified" status displays the correct visual markers.
   */
  it("renders the correct icon for unverified status", () => {
    // Arrange: Render the indicator with an unverified status.
    render(<VerificationIndicator verificationStatus="unverified" />);

    // Assert: Verify the unverified icon and the corresponding tooltip text are rendered.
    expect(screen.getByTestId("icon-unverified")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("Unverified");
  });

  /**
   * Test case to verify that the "in_progress" status omits the badge when requested via props.
   */
  it("renders in_progress status without badge when showBadge is false", () => {
    // Arrange: Provide counts and explicitly disable the badge.
    render(
      <VerificationIndicator
        verificationStatus="in_progress"
        totalDetections={10}
        verifiedDetections={5}
        showBadge={false}
      />
    );

    // Assert: Verify the progress icon is shown, but the badge is absent while the tooltip shows percentage.
    expect(screen.getByTestId("icon-progress")).toBeInTheDocument();
    expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("50.0% In Progress");
  });

  /**
   * Test case to verify that a badge containing the calculated percentage is rendered for ongoing verification.
   */
  it("renders badge with percentage when showBadge is true and status is in_progress", () => {
    // Arrange: Render with active badge prop and specific progress counts.
    render(
      <VerificationIndicator
        verificationStatus="in_progress"
        totalDetections={4}
        verifiedDetections={1}
        showBadge={true}
      />
    );

    // Assert: Verify the badge displays the correct 25% calculation and the icon remains visible.
    const badge = screen.getByTestId("badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("25.0% In Progress");
    expect(screen.getByTestId("icon-progress")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("25.0% In Progress");
  });

  /**
   * Test case to verify that the badge is suppressed if the necessary data for percentage calculation is missing.
   */
  it("does not render badge if status is in_progress but counts are missing", () => {
    // Arrange: Set status to in_progress but omit `totalDetections` and `verifiedDetections`.
    render(<VerificationIndicator verificationStatus="in_progress" showBadge={true} />);

    // Assert: Check that the badge is not rendered while the generic status icon and tooltip persist.
    expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
    expect(screen.getByTestId("icon-progress")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("In Progress");
  });

  /**
   * Test case to verify that custom CSS classes can be passed to the root container.
   */
  it("applies custom className to the container", () => {
    // Arrange: Provide a custom class through the `className` prop.
    render(<VerificationIndicator verificationStatus="no_detections" className="custom-class" />);

    // Assert: Verify the container element has both the default and custom classes.
    const container = screen.getByLabelText("No Detections");
    expect(container).toHaveClass("custom-class");
    expect(container).toHaveClass("flex items-center justify-center");
  });

  /**
   * Test case to verify that custom CSS classes are correctly applied to the badge element.
   */
  it("applies custom className to the badge when active", () => {
    // Arrange: Provide a custom class while the badge is active.
    render(
      <VerificationIndicator
        verificationStatus="in_progress"
        totalDetections={10}
        verifiedDetections={5}
        showBadge={true}
        className="custom-badge-class"
      />
    );

    // Assert: Verify that the badge element receives the custom styling class.
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveClass("custom-badge-class");
  });

  /**
   * Test case to verify component stability and fallback logic when the total detection count is zero.
   */
  it("handles totalDetections being zero gracefully", () => {
    // Arrange: Provide zero for `totalDetections` to test division by zero protection.
    render(
      <VerificationIndicator
        verificationStatus="in_progress"
        totalDetections={0}
        verifiedDetections={0}
        showBadge={true}
      />
    );

    // Assert: Verify that the badge is not rendered and the tooltip falls back to the generic label.
    expect(screen.queryByTestId("badge")).not.toBeInTheDocument();
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("In Progress");
  });

  /**
   * Test case to verify the visual state for cases or images with no found detections.
   */
  it("renders correctly for no_detections status", () => {
    // Arrange: Render the indicator with the "no_detections" status.
    render(<VerificationIndicator verificationStatus="no_detections" />);

    // Assert: Verify the warning icon and the "No Detections" tooltip text are displayed.
    expect(screen.getByTestId("icon-warning")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-content")).toHaveTextContent("No Detections");
  });
});
