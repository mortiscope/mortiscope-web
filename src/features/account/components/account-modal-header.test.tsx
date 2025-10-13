import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog } from "@/components/ui/dialog";
import { AccountModalHeader } from "@/features/account/components/account-modal-header";

/**
 * Test suite for the `AccountModalHeader` component.
 */
describe("AccountModalHeader", () => {
  /**
   * Test case to verify that the title prop is correctly rendered within the modal header.
   */
  it("renders title correctly", () => {
    // Arrange: Render the header inside a Dialog provider with a specific title.
    render(
      <Dialog>
        <AccountModalHeader title="Test Title" />
      </Dialog>
    );

    // Assert: Check that the `title` string is present in the document.
    expect(screen.getByText("Test Title")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the description prop is rendered when provided.
   */
  it("renders description when provided", () => {
    // Arrange: Render the header with both `title` and `description` props.
    render(
      <Dialog>
        <AccountModalHeader title="Test Title" description="Test Description" />
      </Dialog>
    );

    // Assert: Check that the `description` string is present in the document.
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the description element is absent when the prop is omitted.
   */
  it("does not render description when not provided", () => {
    // Arrange: Render the header using only the mandatory `title` prop.
    render(
      <Dialog>
        <AccountModalHeader title="Test Title" />
      </Dialog>
    );

    // Assert: Confirm that the description text does not exist in the DOM.
    expect(screen.queryByText("Test Description")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the emerald color theme is applied as the default style.
   */
  it("applies emerald color variant by default", () => {
    // Arrange: Render the header without specifying a variant.
    render(
      <Dialog>
        <AccountModalHeader title="Emerald Title" />
      </Dialog>
    );

    // Assert: Check for the presence of the default emerald text color class.
    const title = screen.getByText("Emerald Title");
    expect(title).toHaveClass("text-emerald-600");
  });

  /**
   * Test case to verify that the rose color variant is applied correctly.
   */
  it("applies rose color variant correctly", () => {
    // Arrange: Render the header with the `variant` prop set to `rose`.
    render(
      <Dialog>
        <AccountModalHeader title="Rose Title" variant="rose" />
      </Dialog>
    );

    // Assert: Check for the presence of the rose text color class.
    const title = screen.getByText("Rose Title");
    expect(title).toHaveClass("text-rose-600");
  });

  /**
   * Test case to verify that the slate color variant is applied correctly.
   */
  it("applies slate color variant correctly", () => {
    // Arrange: Render the header with the `variant` prop set to `slate`.
    render(
      <Dialog>
        <AccountModalHeader title="Slate Title" variant="slate" />
      </Dialog>
    );

    // Assert: Check for the presence of the slate text color class.
    const title = screen.getByText("Slate Title");
    expect(title).toHaveClass("text-slate-600");
  });
});
