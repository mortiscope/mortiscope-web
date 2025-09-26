import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResultsDetails } from "@/features/results/components/results-details";

// Mock the skeleton component to verify that loading states trigger the correct placeholder.
vi.mock("@/features/results/components/results-skeleton", () => ({
  ResultsDetailsSkeleton: () => <div data-testid="results-details-skeleton" />,
}));

// Mock the UI Card components to simplify the DOM structure for unit testing.
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={className}>{children}</h3>
  ),
}));

// Mock icon components from react-icons to verify their inclusion via test IDs.
vi.mock("react-icons/fa", () => ({
  FaBuilding: () => <span data-testid="icon-building" />,
  FaCalendarAlt: () => <span data-testid="icon-calendar" />,
  FaCity: () => <span data-testid="icon-city" />,
  FaHouseUser: () => <span data-testid="icon-house" />,
  FaMapMarkedAlt: () => <span data-testid="icon-map" />,
  FaThermometerThreeQuarters: () => <span data-testid="icon-thermometer" />,
}));

// Define a static data object to provide consistent input for the component's detail fields.
const mockCaseData = {
  id: "case-123",
  caseName: "Test Case",
  caseDate: new Date("2025-01-25T10:00:00Z"),
  temperatureCelsius: 28.5,
  locationRegion: "Region 1",
  locationProvince: "Province 1",
  locationCity: "City 1",
  locationBarangay: "Barangay 1",
  createdAt: new Date(),
  userId: "user-123",
  status: "active" as const,
  recalculationNeeded: false,
  notes: "",
};

/**
 * Test suite for the `ResultsDetails` component.
 */
describe("ResultsDetails", () => {
  /**
   * Test case to verify that the loading skeleton is displayed during data fetching.
   */
  it("renders loading skeleton when isLoading is true", () => {
    // Arrange: Set the `isLoading` prop to true.
    render(<ResultsDetails isLoading={true} caseData={mockCaseData} />);

    // Assert: Verify that the skeleton is visible and the actual data cards are hidden.
    expect(screen.getByTestId("results-details-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("card")).not.toBeInTheDocument();
  });

  /**
   * Test case to verify that the loading skeleton is displayed if case data is missing.
   */
  it("renders loading skeleton when caseData is missing", () => {
    // Arrange: Provide an undefined `caseData` object.
    render(<ResultsDetails isLoading={false} caseData={undefined} />);

    // Assert: Verify that the component falls back to the skeleton state.
    expect(screen.getByTestId("results-details-skeleton")).toBeInTheDocument();
  });

  /**
   * Test case to verify that all six metadata categories are rendered as cards.
   */
  it("renders all detail cards when data is available", () => {
    // Arrange: Render the component with valid data.
    render(<ResultsDetails isLoading={false} caseData={mockCaseData} />);

    // Act: Count the card elements.
    const cards = screen.getAllByTestId("card");

    // Assert: Verify the count and the presence of category headers.
    expect(cards).toHaveLength(6);
    expect(screen.getByText("Case Date")).toBeInTheDocument();
    expect(screen.getByText("Temperature")).toBeInTheDocument();
    expect(screen.getByText("Region")).toBeInTheDocument();
    expect(screen.getByText("Province")).toBeInTheDocument();
    expect(screen.getByText("City/Municipality")).toBeInTheDocument();
    expect(screen.getByText("Barangay")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the `caseDate` is formatted into a human-readable string.
   */
  it("formats and displays the date correctly", () => {
    // Arrange: Render the component.
    render(<ResultsDetails isLoading={false} caseData={mockCaseData} />);

    // Assert: Check for the expected long-form date string and associated icons.
    expect(screen.getByText("January 25, 2025")).toBeInTheDocument();
    expect(screen.getAllByTestId("icon-calendar")).toHaveLength(2);
  });

  /**
   * Test case to verify that the `temperatureCelsius` is displayed with the degree unit.
   */
  it("formats and displays the temperature correctly", () => {
    // Arrange: Render the component.
    render(<ResultsDetails isLoading={false} caseData={mockCaseData} />);

    // Assert: Check for the formatted temperature string and associated icons.
    expect(screen.getByText("28.5°C")).toBeInTheDocument();
    expect(screen.getAllByTestId("icon-thermometer")).toHaveLength(2);
  });

  /**
   * Test case to verify that geographic location strings are rendered in the correct fields.
   */
  it("displays location details correctly", () => {
    // Arrange: Render the component.
    render(<ResultsDetails isLoading={false} caseData={mockCaseData} />);

    // Assert: Verify each location segment matches the `mockCaseData` values.
    expect(screen.getByText("Region 1")).toBeInTheDocument();
    expect(screen.getByText("Province 1")).toBeInTheDocument();
    expect(screen.getByText("City 1")).toBeInTheDocument();
    expect(screen.getByText("Barangay 1")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component uses the expected Tailwind grid utility classes for responsiveness.
   */
  it("applies correct grid layout classes", () => {
    // Arrange: Render the component and capture the root container.
    const { container } = render(<ResultsDetails isLoading={false} caseData={mockCaseData} />);
    const grid = container.firstChild;

    // Assert: Check for grid configuration classes for mobile, tablet, and desktop viewports.
    expect(grid).toHaveClass("grid");
    expect(grid).toHaveClass("grid-cols-2");
    expect(grid).toHaveClass("md:grid-cols-3");
    expect(grid).toHaveClass("lg:grid-cols-6");
  });
});
