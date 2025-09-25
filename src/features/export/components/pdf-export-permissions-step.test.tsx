import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/__tests__/setup/test-utils";
import { PdfExportPermissionsStep } from "@/features/export/components/pdf-export-permissions-step";
import { PdfPermissions } from "@/features/export/constants/pdf-options";

const defaultPermissions: PdfPermissions = {
  printing: false,
  degradedPrinting: false,
  copying: false,
  extraction: false,
  screenReader: false,
  annotations: false,
  formFilling: false,
  assembly: false,
  pageRotation: false,
  metadataModification: false,
};

/**
 * Groups related tests into a suite for the PDF Export Permissions Step component.
 *
 */
describe("PdfExportPermissionsStep", () => {
  const defaultProps = {
    permissions: defaultPermissions,
    onPermissionsChange: vi.fn(),
    isPending: false,
  };

  /**
   * Test case to verify that all available permission options are rendered.
   */
  it("renders all permission options", () => {
    // Arrange: Render the component with default props.
    render(<PdfExportPermissionsStep {...defaultProps} />);

    // Assert: Verify that every permission checkbox label is present in the document.
    expect(screen.getByLabelText(/Disallow Changing the Document/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Disallow Printing")).toBeInTheDocument();
    expect(screen.getByLabelText("Disallow Degraded Printing")).toBeInTheDocument();
    expect(screen.getByLabelText("Disallow Copying of Text and Images")).toBeInTheDocument();
    expect(screen.getByLabelText("Disallow Content Extraction")).toBeInTheDocument();
    expect(screen.getByLabelText("Disallow Screen Reader Access")).toBeInTheDocument();
    expect(screen.getByLabelText("Disallow Adding Comments or Annotations")).toBeInTheDocument();
    expect(screen.getByLabelText("Disallow Filling Forms")).toBeInTheDocument();
    expect(screen.getByLabelText("Disallow Document Assembly")).toBeInTheDocument();
    expect(screen.getByLabelText("Disallow Page Rotation")).toBeInTheDocument();
    expect(screen.getByLabelText("Disallow Metadata Modification")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the 'Changing the Document' checkbox is mandatory and disabled.
   */
  it("renders the required 'Changing the Document' checkbox as checked and disabled", () => {
    // Arrange: Render the component.
    render(<PdfExportPermissionsStep {...defaultProps} />);

    // Assert: Verify the required checkbox state is checked and disabled.
    const requiredCheckbox = screen.getByLabelText(/Disallow Changing the Document/i);
    expect(requiredCheckbox).toBeChecked();
    expect(requiredCheckbox).toBeDisabled();
  });

  /**
   * Test case to verify that disabling printing auto-selects dependent degraded printing options.
   */
  it("updates permissions and auto-selects dependent options for Printing", async () => {
    // Arrange: Setup user event and render with a mock handler.
    const user = userEvent.setup();
    const handlePermissionsChange = vi.fn();

    render(
      <PdfExportPermissionsStep {...defaultProps} onPermissionsChange={handlePermissionsChange} />
    );

    // Act: Click the "Disallow Printing" checkbox.
    await user.click(screen.getByLabelText("Disallow Printing"));

    // Assert: Verify that both `printing` and `degradedPrinting` are set to true.
    expect(handlePermissionsChange).toHaveBeenCalledWith({
      ...defaultPermissions,
      printing: true,
      degradedPrinting: true,
    });
  });

  /**
   * Test case to verify that disabling copying auto-selects extraction and screen reader options.
   */
  it("updates permissions and auto-selects dependent options for Copying", async () => {
    // Arrange: Setup user event and render with a mock handler.
    const user = userEvent.setup();
    const handlePermissionsChange = vi.fn();

    render(
      <PdfExportPermissionsStep {...defaultProps} onPermissionsChange={handlePermissionsChange} />
    );

    // Act: Click the "Disallow Copying" checkbox.
    await user.click(screen.getByLabelText("Disallow Copying of Text and Images"));

    // Assert: Verify that `copying`, `extraction`, and `screenReader` are set to true.
    expect(handlePermissionsChange).toHaveBeenCalledWith({
      ...defaultPermissions,
      copying: true,
      extraction: true,
      screenReader: true,
    });
  });

  /**
   * Test case to verify that disabling annotations auto-selects form filling options.
   */
  it("updates permissions and auto-selects dependent options for Annotations", async () => {
    // Arrange: Setup user event and render with a mock handler.
    const user = userEvent.setup();
    const handlePermissionsChange = vi.fn();

    render(
      <PdfExportPermissionsStep {...defaultProps} onPermissionsChange={handlePermissionsChange} />
    );

    // Act: Click the "Disallow Annotations" checkbox.
    await user.click(screen.getByLabelText("Disallow Adding Comments or Annotations"));

    // Assert: Verify that `annotations` and `formFilling` are set to true.
    expect(handlePermissionsChange).toHaveBeenCalledWith({
      ...defaultPermissions,
      annotations: true,
      formFilling: true,
    });
  });

  /**
   * Test case to verify that disabling document assembly auto-selects rotation and metadata options.
   */
  it("updates permissions and auto-selects dependent options for Document Assembly", async () => {
    // Arrange: Setup user event and render with a mock handler.
    const user = userEvent.setup();
    const handlePermissionsChange = vi.fn();

    render(
      <PdfExportPermissionsStep {...defaultProps} onPermissionsChange={handlePermissionsChange} />
    );

    // Act: Click the "Disallow Document Assembly" checkbox.
    await user.click(screen.getByLabelText("Disallow Document Assembly"));

    // Assert: Verify that `assembly`, `pageRotation`, and `metadataModification` are set to true.
    expect(handlePermissionsChange).toHaveBeenCalledWith({
      ...defaultPermissions,
      assembly: true,
      pageRotation: true,
      metadataModification: true,
    });
  });

  /**
   * Test case to verify that dependent printing options are disabled when the parent is selected.
   */
  it("disables dependent checkboxes when parent is checked", () => {
    // Arrange: Render with `printing` already selected.
    const permissionsWithPrinting = { ...defaultPermissions, printing: true };

    render(<PdfExportPermissionsStep {...defaultProps} permissions={permissionsWithPrinting} />);

    // Assert: Verify that the dependent degraded printing checkbox is disabled.
    const degradedPrinting = screen.getByLabelText(/Disallow Degraded Printing/i);
    expect(degradedPrinting).toBeDisabled();
    expect(screen.getByLabelText(/Disallow Degraded Printing \(required\)/i)).toBeInTheDocument();
  });

  /**
   * Test case to verify that dependent copying options are disabled when the parent is selected.
   */
  it("disables dependent checkboxes for Copying when checked", () => {
    // Arrange: Render with `copying` already selected.
    const permissionsWithCopying = { ...defaultPermissions, copying: true };

    render(<PdfExportPermissionsStep {...defaultProps} permissions={permissionsWithCopying} />);

    // Assert: Verify that extraction and screen reader checkboxes are disabled.
    expect(screen.getByLabelText(/Disallow Content Extraction/i)).toBeDisabled();
    expect(screen.getByLabelText(/Disallow Screen Reader Access/i)).toBeDisabled();
  });

  /**
   * Test case to verify that dependent annotation options are disabled when the parent is selected.
   */
  it("disables dependent checkboxes for Annotations when checked", () => {
    // Arrange: Render with `annotations` already selected.
    const permissionsWithAnnotations = { ...defaultPermissions, annotations: true };

    render(<PdfExportPermissionsStep {...defaultProps} permissions={permissionsWithAnnotations} />);

    // Assert: Verify that the form filling checkbox is disabled.
    expect(screen.getByLabelText(/Disallow Filling Forms/i)).toBeDisabled();
  });

  /**
   * Test case to verify that dependent assembly options are disabled when the parent is selected.
   */
  it("disables dependent checkboxes for Assembly when checked", () => {
    // Arrange: Render with `assembly` already selected.
    const permissionsWithAssembly = { ...defaultPermissions, assembly: true };

    render(<PdfExportPermissionsStep {...defaultProps} permissions={permissionsWithAssembly} />);

    // Assert: Verify that page rotation and metadata modification checkboxes are disabled.
    expect(screen.getByLabelText(/Disallow Page Rotation/i)).toBeDisabled();
    expect(screen.getByLabelText(/Disallow Metadata Modification/i)).toBeDisabled();
  });

  /**
   * Test case to verify that the component is non-interactive when in a pending state.
   */
  it("disables all interactions when isPending is true", () => {
    // Arrange: Render with `isPending` set to true.
    const { container } = render(<PdfExportPermissionsStep {...defaultProps} isPending={true} />);

    // Assert: Verify that pointer events are disabled and opacity is reduced on the container.
    expect(container.firstChild).toHaveClass("pointer-events-none", "opacity-50");
  });

  /**
   * Test case to verify that dependent options can be selected individually.
   */
  it("updates permissions when individual dependent options are selected", async () => {
    // Arrange: Setup user event and render with a mock handler.
    const user = userEvent.setup();
    const handlePermissionsChange = vi.fn();

    render(
      <PdfExportPermissionsStep {...defaultProps} onPermissionsChange={handlePermissionsChange} />
    );

    const dependentOptions = [
      { label: /Disallow Degraded Printing/i, key: "degradedPrinting" },
      { label: /Disallow Content Extraction/i, key: "extraction" },
      { label: /Disallow Screen Reader Access/i, key: "screenReader" },
      { label: /Disallow Filling Forms/i, key: "formFilling" },
      { label: /Disallow Page Rotation/i, key: "pageRotation" },
      { label: /Disallow Metadata Modification/i, key: "metadataModification" },
    ];

    // Act & Assert: Iterate through options, click them, and verify the correct permission update.
    for (const option of dependentOptions) {
      handlePermissionsChange.mockClear();
      const checkbox = screen.getByLabelText(option.label);
      await user.click(checkbox);
      expect(handlePermissionsChange).toHaveBeenCalledWith({
        ...defaultPermissions,
        [option.key]: true,
      });
    }
  });

  /**
   * Test case to verify that deselecting a parent option updates the state correctly.
   */
  it("updates permissions when parent options are deselected", async () => {
    // Arrange: Setup user event and render with initial permissions set to true.
    const user = userEvent.setup();
    const handlePermissionsChange = vi.fn();

    const initialPermissions: PdfPermissions = {
      ...defaultPermissions,
      printing: true,
      copying: true,
      annotations: true,
      assembly: true,
    };

    render(
      <PdfExportPermissionsStep
        {...defaultProps}
        permissions={initialPermissions}
        onPermissionsChange={handlePermissionsChange}
      />
    );

    const parentOptions = [
      { label: "Disallow Printing", key: "printing" },
      { label: "Disallow Copying of Text and Images", key: "copying" },
      { label: "Disallow Adding Comments or Annotations", key: "annotations" },
      { label: "Disallow Document Assembly", key: "assembly" },
    ];

    // Act & Assert: Iterate through parent options, uncheck them, and verify the update.
    for (const option of parentOptions) {
      handlePermissionsChange.mockClear();
      const checkbox = screen.getByLabelText(option.label);
      await user.click(checkbox);

      expect(handlePermissionsChange).toHaveBeenCalledWith({
        ...initialPermissions,
        [option.key]: false,
      });
    }
  });
});
