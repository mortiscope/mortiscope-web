import { zodResolver } from "@hookform/resolvers/zod";
import { type Control, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { Form } from "@/components/ui/form";
import { CaseNameInput } from "@/features/cases/components/case-name-input";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";

// Define a minimal form schema with a required `caseName` field for validation testing.
const formSchema = z.object({
  caseName: z.string().min(1, "Required"),
});

// A wrapper component to set up the form context and control props for `CaseNameInput`.
const TestWrapper = ({
  defaultValues = { caseName: "" },
  isLocked = false,
  onToggleLock,
}: {
  defaultValues?: { caseName: string };
  isLocked?: boolean;
  onToggleLock?: () => void;
}) => {
  // Arrange: Initialize `react-hook-form` with the schema and default values.
  const form = useForm({
    defaultValues,
    resolver: zodResolver(formSchema),
  });

  return (
    // Arrange: Provide the Form context required by the component.
    <Form {...form}>
      <form>
        <CaseNameInput
          control={form.control as unknown as Control<CaseDetailsFormInput>}
          isLocked={isLocked}
          onToggleLock={onToggleLock}
        />
      </form>
    </Form>
  );
};

/**
 * Test suite for the `CaseNameInput` component.
 */
describe("CaseNameInput", () => {
  /**
   * Test case to verify that the input field renders with the correct label and placeholder.
   */
  it("renders the input correctly", () => {
    // Arrange: Render the component.
    render(<TestWrapper />);

    // Assert: Check for the presence of the descriptive label.
    expect(screen.getByLabelText("Case Name")).toBeInTheDocument();
    // Assert: Check for the presence of the placeholder text.
    expect(screen.getByPlaceholderText("Enter case name")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the input value is updated as the user types.
   */
  it("updates the value when user types", async () => {
    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    render(<TestWrapper />);

    // Act: Locate the input and type a test string into it.
    const input = screen.getByPlaceholderText("Enter case name");
    await user.type(input, "Case #123");

    // Assert: Check that the input element's value matches the typed text.
    expect(input).toHaveValue("Case #123");
  });

  /**
   * Test case to verify that an initial value passed via `defaultValues` is displayed correctly in the input.
   */
  it("displays existing values correctly", () => {
    // Arrange: Render the component with a predefined default value.
    render(<TestWrapper defaultValues={{ caseName: "Existing Case" }} />);

    // Assert: Check that the input element's value matches the default value.
    expect(screen.getByPlaceholderText("Enter case name")).toHaveValue("Existing Case");
  });

  /**
   * Test case to verify that the input field is disabled when `isLocked` is true, preserving the current value.
   */
  it("disables the input when isLocked is true", () => {
    // Arrange: Render the component in a locked state with a default value.
    render(<TestWrapper isLocked={true} defaultValues={{ caseName: "Locked Case" }} />);

    // Assert: Check that the input element is disabled.
    const input = screen.getByPlaceholderText("Enter case name");
    expect(input).toBeDisabled();
    // Assert: Check that the value is still present despite being disabled.
    expect(input).toHaveValue("Locked Case");
  });

  /**
   * Test case to verify that the lock/unlock toggle button is rendered when the `onToggleLock` callback is provided.
   */
  it("renders the lock toggle button when onToggleLock is provided", () => {
    // Arrange: Render the component with a mock toggle function.
    render(<TestWrapper onToggleLock={vi.fn()} />);

    // Assert: Check for the presence of the lock button by its accessible label.
    expect(screen.getByLabelText("Lock")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the lock/unlock toggle button is not rendered when `onToggleLock` is undefined.
   */
  it("does not render the lock toggle button if onToggleLock is undefined", () => {
    // Arrange: Render the component without providing the toggle function.
    render(<TestWrapper onToggleLock={undefined} />);

    // Assert: Check that neither the locked nor unlocked button labels are present.
    expect(screen.queryByLabelText("Lock")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Unlock")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the `onToggleLock` callback is executed when the lock button is clicked.
   */
  it("calls onToggleLock when the lock button is clicked", async () => {
    // Arrange: Set up a mock function for the toggle action and user events.
    const onToggleMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component with the mock callback.
    render(<TestWrapper onToggleLock={onToggleMock} />);

    // Act: Click the lock button.
    const button = screen.getByLabelText("Lock");
    await user.click(button);

    // Assert: Check that the mock callback was called exactly once.
    expect(onToggleMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the correct accessible label (Lock or Unlock) is displayed based on the `isLocked` state.
   */
  it("displays the correct lock state icon/label", () => {
    // Arrange: Render initially in a locked state.
    const { rerender } = render(<TestWrapper isLocked={true} onToggleLock={vi.fn()} />);
    // Assert: Check that the button is labeled "Unlock".
    expect(screen.getByLabelText("Unlock")).toBeInTheDocument();

    // Arrange: Rerender the component in an unlocked state.
    rerender(<TestWrapper isLocked={false} onToggleLock={vi.fn()} />);
    // Assert: Check that the button is labeled "Lock".
    expect(screen.getByLabelText("Lock")).toBeInTheDocument();
  });
});
