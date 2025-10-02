import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DetectionPanelSelector } from "@/features/annotation/components/detection-panel-selector";
import { getLightenedColor } from "@/features/annotation/utils/lightened-color";
import { DETECTION_CLASS_ORDER } from "@/lib/constants";
import { formatLabel } from "@/lib/utils";

// Mock the color utility to return predictable strings for style verification.
vi.mock("@/features/annotation/utils/lightened-color", () => ({
  getLightenedColor: vi.fn((color) => `lightened-${color}`),
}));

// Mock the constants to include an edge-case class for testing fallback logic.
vi.mock("@/lib/constants", async () => {
  const actual = await vi.importActual<typeof import("@/lib/constants")>("@/lib/constants");
  return {
    ...actual,
    DETECTION_CLASS_ORDER: [...actual.DETECTION_CLASS_ORDER, "unknown_class"],
  };
});

/**
 * Test suite for the `DetectionPanelSelector` component.
 */
describe("DetectionPanelSelector", () => {
  // Mock function to track selection changes.
  const mockOnLabelChange = vi.fn();
  // Standard selection value derived from the mock constants.
  const defaultSelected = DETECTION_CLASS_ORDER[0];

  // Reset mocks before each test to ensure clean state and call counts.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that every detection class defined in the system constants is rendered as an option.
   */
  it("renders all detection class options defined in constants", () => {
    // Arrange: Render the selector component.
    render(
      <DetectionPanelSelector selectedLabel={defaultSelected} onLabelChange={mockOnLabelChange} />
    );

    // Assert: Check that every formatted label string is associated with an accessible input.
    DETECTION_CLASS_ORDER.forEach((classLabel) => {
      const formattedLabel = formatLabel(classLabel);
      expect(screen.getByLabelText(formattedLabel)).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the radio input corresponding to the `selectedLabel` prop is checked.
   */
  it("marks the selected label as checked", () => {
    // Arrange: Define a specific selected label.
    const selectedLabel = DETECTION_CLASS_ORDER[1];
    render(
      <DetectionPanelSelector selectedLabel={selectedLabel} onLabelChange={mockOnLabelChange} />
    );

    // Act: Locate both the selected and an unselected radio input.
    const selectedRadio = screen.getByLabelText(formatLabel(selectedLabel));
    const unselectedRadio = screen.getByLabelText(formatLabel(DETECTION_CLASS_ORDER[0]));

    // Assert: Verify the checked state of the inputs.
    expect(selectedRadio).toBeChecked();
    expect(unselectedRadio).not.toBeChecked();
  });

  /**
   * Test case to verify that selecting a new option triggers the `onLabelChange` callback with the correct payload.
   */
  it("calls onLabelChange when a different option is clicked", () => {
    // Arrange: Render the component with an initial selection.
    render(
      <DetectionPanelSelector selectedLabel={defaultSelected} onLabelChange={mockOnLabelChange} />
    );

    // Act: Simulate a user clicking a different radio option.
    const targetLabel = DETECTION_CLASS_ORDER[1];
    const targetRadio = screen.getByLabelText(formatLabel(targetLabel));
    fireEvent.click(targetRadio);

    // Assert: Ensure the callback was executed with the value of the clicked option.
    expect(mockOnLabelChange).toHaveBeenCalledTimes(1);
    expect(mockOnLabelChange).toHaveBeenCalledWith(targetLabel);
  });

  /**
   * Test case to verify that the active option receives specific background styling for visual feedback.
   */
  it("applies selected styling to the active item", () => {
    // Arrange: Render the component.
    render(
      <DetectionPanelSelector selectedLabel={defaultSelected} onLabelChange={mockOnLabelChange} />
    );

    // Act: Traverse the DOM to find the label container for the active item.
    const activeLabelText = formatLabel(defaultSelected);
    const activeLabelElement = screen.getByText(activeLabelText).closest("label");

    // Assert: Verify the presence of the solid emerald background color.
    expect(activeLabelElement).toHaveStyle({ backgroundColor: "rgba(5, 150, 105)" });
  });

  /**
   * Test case to verify that inactive options receive a dimmed or translucent background style.
   */
  it("applies unselected styling to inactive items", () => {
    // Arrange: Render the component.
    render(
      <DetectionPanelSelector selectedLabel={defaultSelected} onLabelChange={mockOnLabelChange} />
    );

    // Act: Traverse the DOM to find the label container for an inactive item.
    const inactiveLabel = DETECTION_CLASS_ORDER[1];
    const inactiveLabelText = formatLabel(inactiveLabel);
    const inactiveLabelElement = screen.getByText(inactiveLabelText).closest("label");

    // Assert: Verify the presence of the translucent emerald background color.
    expect(inactiveLabelElement).toHaveStyle({
      backgroundColor: "rgba(16, 185, 129, 0.15)",
    });
  });

  /**
   * Test case to verify that classes without defined colors use the slate fallback color and lighter border logic.
   */
  it("uses default color for class with missing color definition", () => {
    // Arrange: Set selection to the intentionally unknown class.
    const unknownLabel = "unknown_class";
    render(
      <DetectionPanelSelector selectedLabel={unknownLabel} onLabelChange={mockOnLabelChange} />
    );

    // Assert: Verify that the lightened color utility was called with the slate fallback hex.
    expect(getLightenedColor).toHaveBeenCalledWith("#64748b");

    // Assert: Verify the resulting border color is applied to the component's label container.
    const labelText = formatLabel(unknownLabel);
    const labelElement = screen.getByText(labelText).closest("label");
    expect(labelElement).toHaveStyle({ borderColor: "lightened-#64748b" });
  });
});
