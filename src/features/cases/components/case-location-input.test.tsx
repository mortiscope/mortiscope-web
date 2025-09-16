import { useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { CaseLocationInput } from "@/features/cases/components/case-location-input";
import { type CaseDetailsFormInput } from "@/features/cases/schemas/case-details";

// Interface defining the expected props passed to the mocked child component.
interface MockLocationDropdownProps {
  basePath: string;
  labelText: string;
  regionList: unknown[];
  isLocked: boolean;
  onToggleLock: () => void;
}

// Mock the `LocationDropdown` component to isolate the component logic and verify prop passing.
vi.mock("@/components/location-dropdown", () => ({
  LocationDropdown: (props: MockLocationDropdownProps) => (
    <div data-testid="mock-location-dropdown">
      <span data-testid="prop-basePath">{props.basePath}</span>
      <span data-testid="prop-labelText">{props.labelText}</span>
      <span data-testid="prop-region-count">{props.regionList?.length}</span>
      <span data-testid="prop-isLocked">{String(props.isLocked)}</span>
      <button onClick={props.onToggleLock}>Mock Toggle Lock</button>
    </div>
  ),
}));

// Mock the styles constants to prevent errors and verify their usage is encapsulated.
vi.mock("@/features/cases/constants/styles", () => ({
  sectionTitle: "mock-section-title",
  selectItemStyles: "mock-select-item-styles",
  selectTriggerStyles: "mock-select-trigger-styles",
  uniformInputStyles: "mock-uniform-input-styles",
}));

// A test wrapper component to set up the form context required by `CaseLocationInput`.
const TestWrapper = (props: Partial<React.ComponentProps<typeof CaseLocationInput>>) => {
  // Arrange: Initialize a mock form instance for the required context.
  const form = useForm<CaseDetailsFormInput>();

  // Arrange: Define default props, including the required list props and form instance.
  const defaultProps = {
    form: form as unknown as UseFormReturn<CaseDetailsFormInput>,
    regionList: [{ code: "R1", name: "Region IV-A - CALABARZON" }],
    provinceList: [],
    cityList: [],
    barangayList: [],
    ...props,
  };

  return <CaseLocationInput {...defaultProps} />;
};

/**
 * Test suite for the `CaseLocationInput` component.
 */
describe("CaseLocationInput", () => {
  /**
   * Test case to verify that the primary mocked child component is rendered.
   */
  it("renders the LocationDropdown component", () => {
    // Arrange: Render the component.
    render(<TestWrapper />);
    // Assert: Check for the presence of the mock location dropdown.
    expect(screen.getByTestId("mock-location-dropdown")).toBeInTheDocument();
  });

  /**
   * Test case to verify that static configuration props, such as the base form path and label text, are passed correctly.
   */
  it("passes the correct static configuration props", () => {
    // Arrange: Render the component.
    render(<TestWrapper />);

    // Assert: Check that the `basePath` prop is set to "location".
    expect(screen.getByTestId("prop-basePath")).toHaveTextContent("location");
    // Assert: Check that the `labelText` prop is set to "Location".
    expect(screen.getByTestId("prop-labelText")).toHaveTextContent("Location");
  });

  /**
   * Test case to verify that dynamic list data props, such as the region list, are passed correctly.
   */
  it("passes the dynamic list props correctly", () => {
    // Arrange: Define a mock list with two regions.
    const mockRegions = [
      { code: "1", name: "Region IV-A - CALABARZON" },
      { code: "2", name: "Region IV-B - MIMAROPA" },
    ];

    // Arrange: Render the component with the mock list.
    render(<TestWrapper regionList={mockRegions} />);

    // Assert: Check that the child component receives the correct count of regions.
    expect(screen.getByTestId("prop-region-count")).toHaveTextContent("2");
  });

  /**
   * Test case to verify that the `isLocked` prop, which controls component editability, is passed correctly and responds to changes.
   */
  it("passes the isLocked prop correctly", () => {
    // Arrange: Render initially with `isLocked` set to true.
    const { rerender } = render(<TestWrapper isLocked={true} />);
    // Assert: Check that the `isLocked` display reflects "true".
    expect(screen.getByTestId("prop-isLocked")).toHaveTextContent("true");

    // Arrange: Rerender the component with `isLocked` set to false.
    rerender(<TestWrapper isLocked={false} />);
    // Assert: Check that the `isLocked` display reflects "false".
    expect(screen.getByTestId("prop-isLocked")).toHaveTextContent("false");
  });

  /**
   * Test case to verify that the `onToggleLock` callback is correctly wired to the child component and executed upon interaction.
   */
  it("passes the onToggleLock callback correctly", async () => {
    // Arrange: Define a mock function for the toggle action and set up user events.
    const onToggleMock = vi.fn();
    const user = userEvent.setup();

    // Arrange: Render the component with the mock callback.
    render(<TestWrapper onToggleLock={onToggleMock} />);

    // Act: Click the mock toggle lock button rendered by the child component.
    const toggleButton = screen.getByText("Mock Toggle Lock");
    await user.click(toggleButton);

    // Assert: Check that the mock callback was called exactly once.
    expect(onToggleMock).toHaveBeenCalledTimes(1);
  });
});
