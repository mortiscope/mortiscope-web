import React from "react";
import { FormProvider, useForm } from "react-hook-form";
import { beforeEach,describe, expect, it, vi } from "vitest";

import { render, screen, userEvent, waitFor } from "@/__tests__/setup/test-utils";
import { CaseTemperatureInput } from "@/features/cases/components/case-temperature-input";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";
import { getCoordinates, getHistoricalTemperature } from "@/features/cases/utils/weather-service";

// Mock the weather service utility functions to control network responses.
vi.mock("@/features/cases/utils/weather-service", () => ({
  getCoordinates: vi.fn(),
  getHistoricalTemperature: vi.fn(),
}));

// Mock the Tooltip components to simplify rendering and focus on the core component logic.
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Interface for props passed to the test wrapper.
interface TestWrapperProps {
  defaultValues?: Partial<CaseDetailsFormInput>;
  isLocked?: boolean;
  showSwitch?: boolean;
  onToggleLock?: () => void;
}

// A wrapper component to establish the `react-hook-form` context required by `CaseTemperatureInput`.
const TestWrapper = ({
  defaultValues = {},
  isLocked = false,
  showSwitch = true,
  onToggleLock,
}: TestWrapperProps) => {
  // Arrange: Initialize `react-hook-form` with default field values for dependencies.
  const formMethods = useForm<CaseDetailsFormInput>({
    defaultValues: {
      temperature: { value: "", unit: "C" },
      caseDate: new Date("2025-01-01"),
      location: {
        region: { code: "R1", name: "Region 1" },
        province: { code: "P1", name: "Province 1" },
        city: { code: "C1", name: "Manila" },
        barangay: { code: "B1", name: "Barangay 1" },
      },
      ...defaultValues,
    } as CaseDetailsFormInput,
  });

  return (
    // Arrange: Provide the Form context required by the component.
    <FormProvider {...formMethods}>
      <form>
        <CaseTemperatureInput
          control={formMethods.control}
          isLocked={isLocked}
          showSwitch={showSwitch}
          onToggleLock={onToggleLock}
        />
        {/* Helper button to manually change a dependent value (caseDate) for testing effects. */}
        <button
          type="button"
          onClick={() => formMethods.setValue("caseDate", new Date("2025-01-02"))}
        >
          Change Date
        </button>
      </form>
    </FormProvider>
  );
};

/**
 * Test suite for the `CaseTemperatureInput` component.
 */
describe("CaseTemperatureInput", () => {
  beforeEach(() => {
    // Reset all mock function calls before each test execution.
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the temperature input field and unit selector are rendered.
   */
  it("renders the input and unit selector", () => {
    // Arrange: Render the component.
    render(<TestWrapper />);

    // Assert: Check for the presence of the temperature input placeholder.
    expect(screen.getByPlaceholderText("Enter ambient temperature")).toBeInTheDocument();
    // Assert: Check for the presence of the default unit selector text (°C).
    expect(screen.getAllByText("°C")[0]).toBeInTheDocument();
  });

  /**
   * Test case to verify that the user can manually type a value into the temperature input field when it is unlocked.
   */
  it("allows manual input when unlocked", async () => {
    // Arrange: Set up user events and render the component.
    const user = userEvent.setup();
    render(<TestWrapper />);

    // Act: Locate the input and type a test temperature value.
    const input = screen.getByPlaceholderText("Enter ambient temperature");
    await user.type(input, "30.5");

    // Assert: Check that the input element's value reflects the typed input.
    expect(input).toHaveValue("30.5");
  });

  /**
   * Test case to verify that both the input field and the unit selector are disabled when `isLocked` is true.
   */
  it("disables inputs when isLocked is true", () => {
    // Arrange: Render the component with `isLocked` set to true.
    render(<TestWrapper isLocked={true} />);

    // Assert: Check that the temperature input field is disabled.
    expect(screen.getByPlaceholderText("Enter ambient temperature")).toBeDisabled();

    // Assert: Check that the unit selector trigger button is disabled.
    const selectTrigger = screen.getAllByText("°C")[0].closest("button");
    expect(selectTrigger).toBeDisabled();
  });

  /**
   * Test case to verify that the lock button is rendered when the `onToggleLock` prop is provided, and that clicking it calls the handler.
   */
  it("renders the lock button and calls onToggleLock", async () => {
    // Arrange: Define a mock function for the toggle action and set up user events.
    const onToggleLockMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component with the mock handler.
    render(<TestWrapper onToggleLock={onToggleLockMock} />);

    // Act: Click the lock button.
    const lockButton = screen.getByLabelText("Lock");
    await user.click(lockButton);

    // Assert: Check that the mock toggle function was called exactly once.
    expect(onToggleLockMock).toHaveBeenCalled();
  });

  /**
   * Test suite specifically for the functionality related to fetching and setting historical temperature data.
   */
  describe("Historical Temperature Switch", () => {
    /**
     * Test case to verify that the historical temperature switch is disabled if essential dependency fields (`caseDate` or `location`) are missing.
     */
    it("is disabled if required data (date/location) is missing", () => {
      // Arrange: Render with both `caseDate` and `location` set to undefined.
      render(<TestWrapper defaultValues={{ caseDate: undefined, location: undefined }} />);

      // Assert: Check that the switch control is disabled.
      const switchControl = screen.getByRole("switch", { name: /Set Temperature Based on Date/i });
      expect(switchControl).toBeDisabled();
    });

    /**
     * Test case for the successful fetching and automatic setting of temperature when the switch is toggled on.
     */
    it("fetches and sets temperature when toggled on", async () => {
      // Arrange: Mock the weather service functions to return specific coordinate and temperature data.
      vi.mocked(getCoordinates).mockResolvedValue({ lat: 14.5, long: 121.0 });
      vi.mocked(getHistoricalTemperature).mockResolvedValue({ value: 28.5, unit: "C" });

      // Arrange: Set up user events and render the component.
      const user = userEvent.setup();
      render(<TestWrapper />);

      // Act: Click the historical temperature switch on.
      const switchControl = screen.getByRole("switch", { name: /Set Temperature Based on Date/i });
      await user.click(switchControl);

      // Assert: Check that the city name was used to fetch coordinates.
      expect(getCoordinates).toHaveBeenCalledWith("Manila");

      // Assert: Wait for the historical temperature fetch function to be called after coordinates are resolved.
      await waitFor(() => {
        expect(getHistoricalTemperature).toHaveBeenCalled();
      });

      // Assert: Check that the temperature input field is updated with the fetched value.
      const input = screen.getByPlaceholderText("Enter ambient temperature");
      expect(input).toHaveValue("28.5");
    });

    /**
     * Test case to verify that toggling the switch off correctly resets the temperature field to an empty value.
     */
    it("resets fields when toggled off", async () => {
      // Arrange: Mock successful fetching that returns a known temperature value.
      vi.mocked(getCoordinates).mockResolvedValue({ lat: 0, long: 0 });
      vi.mocked(getHistoricalTemperature).mockResolvedValue({ value: 25, unit: "C" });

      // Arrange: Set up user events and render the component.
      const user = userEvent.setup();
      render(<TestWrapper />);

      const switchControl = screen.getByRole("switch");

      // Act (Step 1): Turn on -> Fetch -> Set to 25.
      await user.click(switchControl);
      await waitFor(() =>
        expect(screen.getByPlaceholderText("Enter ambient temperature")).toHaveValue("25")
      );

      // Act (Step 2): Turn off -> Should reset to default ("").
      await user.click(switchControl);

      // Assert: Wait for the temperature input field to be cleared.
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter ambient temperature")).toHaveValue("");
      });
    });

    /**
     * Test case to verify that if a dependency changes while the switch is on, the switch automatically turns off and the temperature is cleared.
     */
    it("auto-resets (turns off) when dependencies (Date) change", async () => {
      // Arrange: Mock successful fetching that returns a known temperature value.
      vi.mocked(getCoordinates).mockResolvedValue({ lat: 0, long: 0 });
      vi.mocked(getHistoricalTemperature).mockResolvedValue({ value: 25, unit: "C" });

      // Arrange: Set up user events and render the component.
      const user = userEvent.setup();
      render(<TestWrapper />);

      const switchControl = screen.getByRole("switch");

      // Act (Step 1): Turn on and wait for the temperature to be set.
      await user.click(switchControl);
      await waitFor(() =>
        expect(screen.getByPlaceholderText("Enter ambient temperature")).toHaveValue("25")
      );

      // Act (Step 2): Click the helper button to change the `caseDate` form value.
      await user.click(screen.getByText("Change Date"));

      // Assert (Step 3): Wait for the automatic reset: temperature should be cleared, and the switch should be visually turned off.
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter ambient temperature")).toHaveValue("");
        expect(switchControl).toHaveAttribute("aria-checked", "false");
      });
    });

    /**
     * Test case to verify that if an API call fails during the temperature fetching process, the switch automatically resets to off gracefully.
     */
    it("handles API errors gracefully (resets switch)", async () => {
      // Arrange: Mock the coordinate fetching to fail immediately with an error.
      vi.mocked(getCoordinates).mockRejectedValue(new Error("API Error"));

      // Arrange: Set up user events and render the component.
      const user = userEvent.setup();
      render(<TestWrapper />);

      const switchControl = screen.getByRole("switch");
      // Act: Click the switch on.
      await user.click(switchControl);

      // Assert: Wait for the switch to automatically turn off after the API failure.
      await waitFor(() => {
        expect(switchControl).toHaveAttribute("aria-checked", "false");
      });
    });
  });
});
