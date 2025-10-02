import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "@/__tests__/setup/test-utils";
import { DetailsShortcutsPanel } from "@/features/annotation/components/details-shortcuts-panel";

// Mock the information row component to isolate the testing of shortcut label and value rendering.
vi.mock("@/features/annotation/components/panel-information-row", () => ({
  PanelInformationRow: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div data-testid="shortcut-row" aria-label={label}>
      <span data-testid="row-label">{label}</span>
      <span data-testid="row-value">{value}</span>
    </div>
  ),
}));

// Mock framer-motion to bypass layout animations and allow for direct DOM inspection.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
  },
}));

/**
 * Test suite for the `DetailsShortcutsPanel` component.
 */
describe("DetailsShortcutsPanel", () => {
  /**
   * Test case to verify that the component iterates through and renders the full list of keyboard shortcuts.
   */
  it("renders all defined shortcut rows", () => {
    // Arrange: Render the shortcuts panel.
    render(<DetailsShortcutsPanel />);

    // Assert: Verify that multiple rows are rendered and specific core functionality labels exist.
    const rows = screen.getAllByTestId("shortcut-row");
    expect(rows.length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Annotation Panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Save")).toBeInTheDocument();
  });

  /**
   * Test case to verify that simple single-key triggers are displayed with correct text formatting.
   */
  it("formats single letter shortcuts correctly", () => {
    // Arrange: Render the shortcuts panel.
    render(<DetailsShortcutsPanel />);

    // Act: Locate the specific row for Pan Mode.
    const row = screen.getByLabelText("Pan Mode");
    const value = row.querySelector('[data-testid="row-value"]');

    // Assert: Check that the `H` key is rendered as the trigger.
    expect(value).toHaveTextContent("H");
  });

  /**
   * Test case to verify that multi-key sequences are joined by the standard plus symbol.
   */
  it("formats combination shortcuts correctly", () => {
    // Arrange: Render the shortcuts panel.
    render(<DetailsShortcutsPanel />);

    // Act: Locate the specific row for Reset Changes.
    const row = screen.getByLabelText("Reset Changes");
    const value = row.querySelector('[data-testid="row-value"]');

    // Assert: Check that the full key combination is rendered accurately.
    expect(value).toHaveTextContent("Ctrl + Shift + R");
  });

  /**
   * Test case to ensure that Meta or Command keys are filtered out to maintain a Windows/Linux-centric UI.
   */
  it("filters out Mac-specific (meta) shortcuts", () => {
    // Arrange: Render the shortcuts panel.
    render(<DetailsShortcutsPanel />);

    // Act: Locate the specific row for Save.
    const row = screen.getByLabelText("Save");
    const value = row.querySelector('[data-testid="row-value"]');

    // Assert: Verify that only the `Ctrl` modifier is present and Mac terminology is absent.
    expect(value).toHaveTextContent("Ctrl + S");
    expect(value).not.toHaveTextContent("Meta");
    expect(value).not.toHaveTextContent("Cmd");
  });

  /**
   * Test case to verify that technical key names are mapped to user-friendly character symbols.
   */
  it("replaces special key names correctly", () => {
    // Arrange: Render the shortcuts panel.
    render(<DetailsShortcutsPanel />);

    // Act: Locate rows using bracket keys.
    const prevRow = screen.getByLabelText("Previous Image");
    const nextRow = screen.getByLabelText("Next Image");

    // Assert: Verify that `BracketLeft` and `BracketRight` are replaced by their respective symbols.
    expect(prevRow.querySelector('[data-testid="row-value"]')).toHaveTextContent("[");
    expect(nextRow.querySelector('[data-testid="row-value"]')).toHaveTextContent("]");
  });

  /**
   * Test case to verify that complex combinations involving three or more keys are rendered correctly.
   */
  it("handles complex combinations with special keys", () => {
    // Arrange: Render the shortcuts panel.
    render(<DetailsShortcutsPanel />);

    // Act: Locate the specific row for Reset View.
    const row = screen.getByLabelText("Reset View");
    const value = row.querySelector('[data-testid="row-value"]');

    // Assert: Verify the concatenated key string.
    expect(value).toHaveTextContent("Ctrl + Alt + 0");
  });

  /**
   * Test case to verify that destructive action shortcuts are presented with intuitive dual-labeling.
   */
  it("formats delete/backspace correctly", () => {
    // Arrange: Render the shortcuts panel.
    render(<DetailsShortcutsPanel />);

    // Act: Locate the specific row for Delete Selected.
    const row = screen.getByLabelText("Delete Selected");
    const value = row.querySelector('[data-testid="row-value"]');

    // Assert: Verify that both standard deletion keys are listed.
    expect(value).toHaveTextContent("Delete / Backspace");
  });
});
