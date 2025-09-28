import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { type UploadWithDetections } from "@/features/results/components/results-analysis";
import {
  type ChartType,
  SummaryChartToolbar,
} from "@/features/results/components/summary-chart-toolbar";

// Mock the Button component to provide a stable, testable DOM element for interaction testing.
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    "aria-label"?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

// Mock the DropdownMenu components to verify menu item rendering and selection callbacks.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <div role="menuitem" onClick={onSelect}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

// Mock Tooltip components to ensure visibility without complex hover state logic.
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock various chart and utility icons to verify visual state mapping via test IDs.
vi.mock("react-icons/ai", () => ({
  AiOutlineRadarChart: () => <span data-testid="icon-radar" />,
}));
vi.mock("react-icons/bs", () => ({
  BsPieChart: () => <span data-testid="icon-pie" />,
}));
vi.mock("react-icons/io5", () => ({
  IoBarChartOutline: () => <span data-testid="icon-bar" />,
  IoGridOutline: () => <span data-testid="icon-grid" />,
  IoImagesOutline: () => <span data-testid="icon-images" />,
  IoInformation: () => <span data-testid="icon-info" />,
  IoPodiumOutline: () => <span data-testid="icon-podium" />,
}));
vi.mock("react-icons/lu", () => ({
  LuChartLine: () => <span data-testid="icon-line" />,
}));
vi.mock("react-icons/tb", () => ({
  TbChartAreaLine: () => <span data-testid="icon-area" />,
}));

// Define mock upload data to verify data source selection logic.
const mockUploads = [
  { id: "upload-1", name: "Image 1.jpg", detections: [] },
  { id: "upload-2", name: "Image 2.jpg", detections: [] },
] as unknown as UploadWithDetections[];

/**
 * Test suite for the `SummaryChartToolbar` component.
 */
describe("SummaryChartToolbar", () => {
  const defaultProps = {
    selectedChart: "Bar Chart" as const,
    onChartSelect: vi.fn(),
    onInfoClick: vi.fn(),
    selectedDataSource: "overall",
    onDataSourceSelect: vi.fn(),
    uploads: mockUploads,
    isDataSourceDisabled: false,
  };

  /**
   * Test case to verify that the component mounts and displays all primary control triggers.
   */
  it("renders correctly after mounting", async () => {
    // Arrange: Render the toolbar component.
    render(<SummaryChartToolbar {...defaultProps} />);

    // Assert: Verify that chart type, data source, and information triggers are accessible.
    await waitFor(() => {
      expect(screen.getByLabelText("Select chart type")).toBeInTheDocument();
    });

    const chartTrigger = screen.getByLabelText("Select chart type");
    expect(within(chartTrigger).getByTestId("icon-bar")).toBeInTheDocument();

    expect(screen.getByLabelText("Information")).toBeInTheDocument();
    expect(screen.getByLabelText("Select Data Source")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the chart type trigger icon updates when the `selectedChart` prop changes.
   */
  it("renders the correct icon for the selected chart type", async () => {
    // Arrange: Start with the Line Chart selection.
    const { rerender } = render(
      <SummaryChartToolbar {...defaultProps} selectedChart="Line Chart" />
    );

    // Assert: Verify the line chart icon is shown.
    await waitFor(() => {
      const chartTrigger = screen.getByLabelText("Select chart type");
      expect(within(chartTrigger).getByTestId("icon-line")).toBeInTheDocument();
    });

    // Act: Update to the Pie Chart selection.
    rerender(<SummaryChartToolbar {...defaultProps} selectedChart="Pie Chart" />);

    // Assert: Verify the icon updates to match the new chart type.
    const chartTrigger = screen.getByLabelText("Select chart type");
    expect(within(chartTrigger).getByTestId("icon-pie")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking the information button executes the `onInfoClick` callback.
   */
  it("calls onInfoClick when the info button is clicked", async () => {
    // Arrange: Setup user interaction and render.
    const user = userEvent.setup();
    render(<SummaryChartToolbar {...defaultProps} />);

    // Act: Simulate a click on the information trigger.
    await waitFor(() => screen.getByLabelText("Information"));
    await user.click(screen.getByLabelText("Information"));

    // Assert: Verify the parent callback was triggered once.
    expect(defaultProps.onInfoClick).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that selecting a specific chart type from the menu triggers the `onChartSelect` callback.
   */
  it("calls onChartSelect when a chart option is clicked", async () => {
    // Arrange: Setup user interaction and render.
    const user = userEvent.setup();
    render(<SummaryChartToolbar {...defaultProps} />);

    // Act: Click a specific chart type option in the menu.
    await waitFor(() => screen.getByLabelText("Select chart type"));
    const pieChartOption = screen.getByText("Pie Chart");
    await user.click(pieChartOption);

    // Assert: Verify the selection was communicated to the parent.
    expect(defaultProps.onChartSelect).toHaveBeenCalledWith("Pie Chart");
  });

  /**
   * Test case to verify that selecting the "Overall" data source option triggers the correct callback.
   */
  it("calls onDataSourceSelect with 'overall' when Overall is clicked", async () => {
    // Arrange: Setup user interaction and render.
    const user = userEvent.setup();
    render(<SummaryChartToolbar {...defaultProps} />);

    // Act: Click the "Overall" menu item.
    await waitFor(() => screen.getByLabelText("Select Data Source"));
    const overallOption = screen.getByText("Overall");
    await user.click(overallOption);

    // Assert: Verify the `onDataSourceSelect` was called with the "overall" key.
    expect(defaultProps.onDataSourceSelect).toHaveBeenCalledWith("overall");
  });

  /**
   * Test case to verify the label reflects the "Maximum Stages" selection in the data source trigger.
   */
  it("renders active active styles for 'maximum-stages'", async () => {
    // Arrange: Render with the specific data source selected.
    render(<SummaryChartToolbar {...defaultProps} selectedDataSource="maximum-stages" />);

    // Assert: Verify the trigger text matches the selection.
    await waitFor(() => screen.getByLabelText("Select Data Source"));
    expect(screen.getByText("Maximum Stages")).toBeInTheDocument();
  });

  /**
   * Test case to verify the label reflects a specific image selection in the data source trigger.
   */
  it("renders active styles for specific uploads", async () => {
    // Arrange: Render with a specific upload ID selected.
    render(<SummaryChartToolbar {...defaultProps} selectedDataSource="upload-1" />);

    // Assert: Verify the trigger text displays the specific image name.
    await waitFor(() => screen.getByLabelText("Select Data Source"));
    expect(screen.getByText("Image 1.jpg")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking a calculated data source option triggers the appropriate callback.
   */
  it("calls onDataSourceSelect when a data source option is clicked", async () => {
    // Arrange: Setup user interaction and render.
    const user = userEvent.setup();
    render(<SummaryChartToolbar {...defaultProps} />);

    // Act: Click the "Maximum Stages" option.
    await waitFor(() => screen.getByLabelText("Select Data Source"));
    const maxStagesOption = screen.getByText("Maximum Stages");
    await user.click(maxStagesOption);

    // Assert: Verify the parent is notified of the specific source selection.
    expect(defaultProps.onDataSourceSelect).toHaveBeenCalledWith("maximum-stages");
  });

  /**
   * Test case to verify that all provided image uploads are rendered as options within the data source menu.
   */
  it("renders upload options in the data source dropdown", async () => {
    // Arrange: Render the component.
    render(<SummaryChartToolbar {...defaultProps} />);

    // Assert: Check for the presence of individual image file names in the dropdown content.
    await waitFor(() => screen.getByLabelText("Select Data Source"));
    expect(screen.getByText("Image 1.jpg")).toBeInTheDocument();
    expect(screen.getByText("Image 2.jpg")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking an image upload option triggers the callback with that image's ID.
   */
  it("calls onDataSourceSelect with upload ID when an upload is clicked", async () => {
    // Arrange: Setup user interaction and render.
    const user = userEvent.setup();
    render(<SummaryChartToolbar {...defaultProps} />);

    // Act: Click an image entry in the menu.
    await waitFor(() => screen.getByLabelText("Select Data Source"));
    await user.click(screen.getByText("Image 1.jpg"));

    // Assert: Verify the callback was executed with the matching upload ID.
    expect(defaultProps.onDataSourceSelect).toHaveBeenCalledWith("upload-1");
  });

  /**
   * Test case to verify that the data source selection can be programmatically disabled.
   */
  it("disables the data source button when isDataSourceDisabled is true", async () => {
    // Arrange: Render with the disabled flag.
    render(<SummaryChartToolbar {...defaultProps} isDataSourceDisabled={true} />);

    // Assert: Verify the button element is in the disabled state.
    await waitFor(() => {
      expect(screen.getByLabelText("Select Data Source")).toBeDisabled();
    });
  });

  /**
   * Test case to verify that a fallback icon is used if an unsupported chart type is provided.
   */
  it("renders with default Bar Chart icon if selectedChart is invalid", async () => {
    // Arrange: Provide an invalid chart type string.
    render(
      <SummaryChartToolbar {...defaultProps} selectedChart={"Invalid" as unknown as ChartType} />
    );

    // Assert: Verify the toolbar falls back to displaying the bar chart icon.
    await waitFor(() => {
      const chartTrigger = screen.getByLabelText("Select chart type");
      expect(within(chartTrigger).getByTestId("icon-bar")).toBeInTheDocument();
    });
  });
});
