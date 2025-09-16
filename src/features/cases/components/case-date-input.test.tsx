import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm, type UseFormReturn } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { fireEvent, render, screen, userEvent, waitFor } from "@/__tests__/setup/test-utils";
import { Form } from "@/components/ui/form";
import { CaseDateInput } from "@/features/cases/components/case-date-input";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";

// Define a minimal form schema for testing the date input component integration.
const formSchema = z.object({
  caseDate: z.date().optional(),
});

// A wrapper component to set up the form context and render the component under test.
const TestWrapper = ({
  defaultValues = { caseDate: undefined },
  ...props
}: {
  defaultValues?: { caseDate?: Date };
  variant?: "horizontal" | "stacked";
  showSwitch?: boolean;
  isLocked?: boolean;
  onToggleLock?: () => void;
}) => {
  // Initialize `react-hook-form` for component state management.
  const form = useForm({
    defaultValues,
    resolver: zodResolver(formSchema),
  });

  return (
    // Arrange: Provide the Form context required by the component.
    <Form {...form}>
      <form>
        <CaseDateInput form={form as unknown as UseFormReturn<CaseDetailsFormInput>} {...props} />
      </form>
    </Form>
  );
};

/**
 * Test suite for the `CaseDateInput` component.
 */
describe("CaseDateInput", () => {
  // Define a fixed mock date to ensure time-based tests are deterministic.
  const MOCK_DATE = new Date("2025-05-15T10:30:00");

  beforeEach(() => {
    // Arrange: Replace real timers with mock timers for consistent date values.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(MOCK_DATE);
  });

  afterEach(() => {
    // Arrange: Restore real timers after each test to avoid side effects.
    vi.useRealTimers();
  });

  /**
   * Test case to verify that all necessary form elements and labels are rendered upon initialization.
   */
  it("renders the inputs correctly", () => {
    // Arrange: Render the component.
    render(<TestWrapper />);

    // Assert: Check for the presence of the main title, date picker trigger, time input, and the "set to now" switch.
    expect(screen.getByText("Case Date and Time")).toBeInTheDocument();
    expect(screen.getAllByText("Pick a date")[0]).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter a time")).toBeInTheDocument();
    expect(screen.getByLabelText("Set to Current Date and Time")).toBeInTheDocument();
  });

  /**
   * Test case to verify that an initial `caseDate` prop value is displayed correctly in both date and time fields.
   */
  it("displays the provided initial value formatted correctly", () => {
    // Arrange: Define an initial date and render the component with it.
    const initialDate = new Date("2025-12-25T14:00:00");
    render(<TestWrapper defaultValues={{ caseDate: initialDate }} />);

    // Assert: Check that the date is formatted using `PPP` and the time input shows the military time.
    expect(screen.getByText(format(initialDate, "PPP"))).toBeInTheDocument();
    expect(screen.getByDisplayValue("14:00:00")).toBeInTheDocument();
  });

  /**
   * Test case to verify that typing a new time value correctly updates the time input display.
   */
  it("updates the time when user types in the time input", async () => {
    // Arrange: Set up an initial date and render the component.
    const initialDate = new Date("2025-05-15T10:00:00");
    render(<TestWrapper defaultValues={{ caseDate: initialDate }} />);

    // Act: Find the time input and manually change its value via `fireEvent`.
    const timeInput = screen.getByPlaceholderText("Enter a time");
    fireEvent.change(timeInput, { target: { value: "15:45:00" } });

    // Assert: Wait for the component to settle and check that the input reflects the new time.
    await waitFor(() => {
      expect(timeInput).toHaveValue("15:45:00");
    });
  });

  /**
   * Test case to verify that toggling the "set to current date" switch updates the form value to the mocked system time.
   */
  it("sets the date to now when the switch is toggled on", async () => {
    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    render(<TestWrapper />);

    // Act: Click the current date toggle switch.
    const toggle = screen.getByLabelText("Set to Current Date and Time");
    await user.click(toggle);

    // Assert: Wait for the date and time fields to display the mock system time.
    await waitFor(() => {
      expect(screen.getByText(format(MOCK_DATE, "PPP"))).toBeInTheDocument();
      expect(screen.getByDisplayValue("10:30:00")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that toggling the "set to current date" switch off clears the form values.
   */
  it("clears the date when the switch is toggled off", async () => {
    // Arrange: Set up user events, render, and toggle the switch on first to set a date.
    const user = userEvent.setup();
    render(<TestWrapper defaultValues={{ caseDate: undefined }} />);

    const toggle = screen.getByLabelText("Set to Current Date and Time");
    await user.click(toggle);
    await waitFor(() => {
      expect(screen.getByText(format(MOCK_DATE, "PPP"))).toBeInTheDocument();
    });

    // Act: Click the toggle switch a second time to turn it off.
    await user.click(toggle);

    // Assert: Wait for the date display to revert to the default placeholder and the time input to be empty.
    await waitFor(() => {
      expect(screen.getAllByText("Pick a date")[0]).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Enter a time")).toHaveValue("");
    });
  });

  /**
   * Test case to verify that all user inputs are disabled when the `isLocked` prop is true.
   */
  it("disables inputs when isLocked is true", () => {
    // Arrange: Render the component in a locked state with an initial date.
    render(<TestWrapper isLocked={true} defaultValues={{ caseDate: MOCK_DATE }} />);

    // Assert: Check that the date picker trigger button is disabled.
    const dateText = format(MOCK_DATE, "PPP");
    const dateDisplay = screen.getByText(dateText);
    expect(dateDisplay.closest("button")).toBeDisabled();
    // Assert: Check that the time input is disabled.
    expect(screen.getByDisplayValue("10:30:00")).toBeDisabled();
    // Assert: Check that the "set to now" switch is disabled.
    expect(screen.getByLabelText("Set to Current Date and Time")).toBeDisabled();
  });

  /**
   * Test case to verify that the lock button renders and triggers `onToggleLock` when clicked.
   */
  it("renders the lock button and handles toggle if onToggleLock is provided", async () => {
    // Arrange: Set up a mock toggle function and user events.
    const onToggleMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component with `onToggleLock` provided.
    render(<TestWrapper variant="stacked" onToggleLock={onToggleMock} isLocked={true} />);

    // Assert: Check for the presence of the lock/unlock button.
    const lockButton = screen.getByLabelText("Unlock");
    expect(lockButton).toBeInTheDocument();

    // Act: Click the lock button.
    await user.click(lockButton);
    // Assert: Check that the provided mock function was called.
    expect(onToggleMock).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that if a date is changed via the calendar picker, the existing time value is preserved.
   */
  it("preserves the time when a new date is selected", async () => {
    // Arrange: Set up user events and render with a specific date and time.
    const user = userEvent.setup();
    const initialDate = new Date("2025-05-15T14:30:45");
    render(<TestWrapper defaultValues={{ caseDate: initialDate }} />);

    // Act: Click the date picker trigger to open the calendar.
    const trigger = screen.getByText(format(initialDate, "PPP"));
    await user.click(trigger);

    // Act: Wait for the calendar grid to load and click a new date (May 10th).
    await screen.findByRole("grid");
    const newDateButton = screen.getByRole("button", { name: /Saturday, May 10th, 2025/i });
    fireEvent.click(newDateButton);

    // Assert: Construct the expected date, which should have the new date but the original time.
    const expectedDate = new Date("2025-05-10T14:30:45");
    await waitFor(() => {
      // Assert: Verify the displayed date and that the original time is preserved.
      expect(screen.getByText(format(expectedDate, "PPP"))).toBeInTheDocument();
      expect(screen.getByDisplayValue("14:30:45")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that dates in the future relative to the mock system time are disabled in the calendar.
   */
  it("disables future dates", async () => {
    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    render(<TestWrapper />);

    // Act: Open the date picker.
    await user.click(screen.getAllByText("Pick a date")[0]);
    await screen.findByRole("grid");

    // Assert: Locate the button for the day after the mock date and verify it is disabled.
    const tomorrowButton = screen.getByRole("button", { name: /Friday, May 16th, 2025/i });
    expect(tomorrowButton).toBeDisabled();
  });

  /**
   * Test case to verify standard focus/blur behavior on the time input field.
   */
  it("handles time input focus and blur events", async () => {
    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    const initialDate = new Date("2025-05-15T10:00:00");
    render(<TestWrapper defaultValues={{ caseDate: initialDate }} />);

    // Act: Click the time input to focus it.
    const timeInput = screen.getByPlaceholderText("Enter a time");
    await user.click(timeInput);
    // Assert: Check that the input has focus.
    expect(timeInput).toHaveFocus();

    // Act: Type a character to verify focus is maintained.
    await user.keyboard("1");
    expect(timeInput).toHaveFocus();

    // Act: Use the Tab key to blur the input.
    await user.tab();
    // Assert: Check that the input has lost focus.
    expect(timeInput).not.toHaveFocus();
  });

  /**
   * Test case to ensure that clearing the time input does not incorrectly clear the entire `caseDate` value.
   */
  it("does not update time on empty input", async () => {
    // Arrange: Set up user events and render with an initial date.
    const user = userEvent.setup();
    const initialDate = new Date("2025-05-15T10:00:00");
    render(<TestWrapper defaultValues={{ caseDate: initialDate }} />);

    // Act: Clear the time input field.
    const timeInput = screen.getByPlaceholderText("Enter a time");
    await user.clear(timeInput);

    // Assert: Check that the date part remains visible, indicating the date value itself was not removed.
    expect(screen.getByText(format(initialDate, "PPP"))).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component applies the correct styling class for a stacked layout variant.
   */
  it("renders in stacked layout correctly", () => {
    // Arrange: Render the component with the `variant="stacked"` prop.
    const { container } = render(<TestWrapper variant="stacked" />);

    // Assert: Check for the presence of the expected CSS class indicating the stacked layout structure.
    const stackedWrapper = container.querySelector(".space-y-4");
    expect(stackedWrapper).toBeInTheDocument();
  });
});
