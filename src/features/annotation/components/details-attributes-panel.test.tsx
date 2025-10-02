import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { useParams } from "next/navigation";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { DetailsAttributesPanel } from "@/features/annotation/components/details-attributes-panel";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import { getCaseById } from "@/features/results/actions/get-case-by-id";

// Mock the Next.js navigation hooks to provide control over URL parameters in a test environment.
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}));

// Mock the server action used to fetch specific case data by its unique identifier.
vi.mock("@/features/results/actions/get-case-by-id", () => ({
  getCaseById: vi.fn(),
}));

// Mock the custom hook responsible for providing the current image data to the editor.
vi.mock("@/features/annotation/hooks/use-editor-image", () => ({
  useEditorImage: vi.fn(),
}));

// Mock the loading spinner component to simplify DOM inspection during asynchronous states.
vi.mock("react-spinners/BeatLoader", () => ({
  default: () => <div data-testid="beat-loader">Loading...</div>,
}));

// Mock the informational row component to facilitate easier verification of labels and values.
vi.mock("@/features/annotation/components/panel-information-row", () => ({
  PanelInformationRow: ({ label, value }: { label: string; value: string }) => (
    <div data-testid="panel-row" data-label={label}>
      <span data-testid="row-label">{label}</span>
      <span data-testid="row-value">{value}</span>
    </div>
  ),
}));

// Mock framer-motion to bypass animation delays and focus strictly on rendered content.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

const OriginalImage = window.Image;

/**
 * Test suite for the `DetailsAttributesPanel` component.
 */
describe("DetailsAttributesPanel", () => {
  let queryClient: QueryClient;

  // Set up a mock for the global Image constructor to simulate resolution detection.
  beforeAll(() => {
    class MockImage {
      onload: ((e: Event) => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      private _src = "";
      naturalWidth = 1920;
      naturalHeight = 1080;

      get src() {
        return this._src;
      }

      set src(url: string) {
        this._src = url;
        // Simulate an asynchronous image loading process.
        setTimeout(() => {
          if (url === "error-url") {
            this.onerror?.(new Event("error"));
          } else {
            this.onload?.(new Event("load"));
          }
        }, 50);
      }
    }

    window.Image = MockImage as unknown as typeof window.Image;
  });

  // Restore the original Image global after all tests have completed.
  afterAll(() => {
    window.Image = OriginalImage;
  });

  // Initialize fresh mocks and a TanStack Query client before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    (useParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ resultsId: "case-123" });

    vi.mocked(getCaseById).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof getCaseById>>
    );

    vi.mocked(useEditorImage).mockReturnValue({
      image: {
        id: "img-1",
        name: "test-image.jpg",
        url: "http://example.com/test-image.jpg",
        dateUploaded: new Date("2025-01-01T12:00:00Z").toISOString(),
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useEditorImage>);
  });

  // Clean the query cache after each test to ensure test isolation.
  afterEach(() => {
    queryClient.clear();
  });

  // Helper function to encapsulate component rendering with required context providers.
  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <DetailsAttributesPanel />
      </QueryClientProvider>
    );

  /**
   * Test case to verify that the loading indicator is displayed while the editor image is being fetched.
   */
  it("renders loading state when case is loading", () => {
    // Arrange: Mock the image hook to indicate a pending operation.
    vi.mocked(useEditorImage).mockReturnValue({
      isLoading: true,
    } as unknown as ReturnType<typeof useEditorImage>);

    renderComponent();

    // Assert: Check for the presence of the mock loader in the document.
    expect(screen.getByTestId("beat-loader")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the component returns null when no case data is successfully retrieved.
   */
  it("renders nothing if case data is missing (and not loading)", async () => {
    // Arrange: Mock the API response to return null for the case query.
    vi.mocked(getCaseById).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof getCaseById>>
    );
    const { container } = renderComponent();

    // Assert: Verify that the component does not mount any elements.
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  /**
   * Test case to verify that valid case and image metadata are rendered correctly in their respective rows.
   */
  it("renders case and image attributes correctly on success", async () => {
    // Arrange: Mock complete case data including location and environmental details.
    const mockCaseData = {
      caseName: "Test Case",
      caseDate: new Date("2025-05-25T00:00:00Z"),
      temperatureCelsius: 28.5,
      locationRegion: "Region 1",
      locationProvince: "Province 1",
      locationCity: "City 1",
      locationBarangay: "Barangay 1",
    };

    vi.mocked(getCaseById).mockResolvedValue(
      mockCaseData as unknown as Awaited<ReturnType<typeof getCaseById>>
    );

    renderComponent();

    // Act: Wait for the primary title to appear.
    await waitFor(() => {
      expect(screen.getByText("Test Case")).toBeInTheDocument();
    });

    // Helper: Function to check if a specific row contains the expected label and value pair.
    const checkRow = (label: string, value: string) => {
      const labelSpan = screen
        .getAllByText(label)
        .find((el) => el.getAttribute("data-testid") === "row-label");
      const valueSpan = labelSpan?.parentElement?.querySelector('[data-testid="row-value"]');
      expect(valueSpan).toHaveTextContent(value);
    };

    // Assert: Confirm all case and location attributes are displayed.
    checkRow("Case Name", "Test Case");
    checkRow("Temperature", "28.5°C");
    checkRow("Region", "Region 1");
    checkRow("Province", "Province 1");
    checkRow("City/Municipality", "City 1");
    checkRow("Barangay", "Barangay 1");

    // Assert: Confirm image-related attributes are displayed.
    checkRow("Image Name", "test-image");
  });

  /**
   * Test case to verify that the component correctly determines the natural dimensions of the image.
   */
  it("calculates and displays image resolution", async () => {
    // Arrange: Mock valid case data to allow the component to render and initiate image loading.
    vi.mocked(getCaseById).mockResolvedValue({
      caseName: "Case",
      caseDate: new Date(),
      temperatureCelsius: 20,
      locationRegion: "R",
      locationProvince: "P",
      locationCity: "C",
      locationBarangay: "B",
    } as unknown as Awaited<ReturnType<typeof getCaseById>>);

    renderComponent();

    // Assert: Check that the temporary loading text is shown while the mock resolution is determined.
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Assert: Verify that the natural resolution from the mock image class is displayed.
    await waitFor(() => {
      expect(screen.getByText("1920 × 1080")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that a resolution error displays a fallback value instead of failing.
   */
  it("handles image resolution load error", async () => {
    // Arrange: Mock case data and an image URL that triggers the mock error state.
    vi.mocked(getCaseById).mockResolvedValue({
      caseName: "Case",
      caseDate: new Date(),
      temperatureCelsius: 20,
      locationRegion: "R",
      locationProvince: "P",
      locationCity: "C",
      locationBarangay: "B",
    } as unknown as Awaited<ReturnType<typeof getCaseById>>);

    vi.mocked(useEditorImage).mockReturnValue({
      image: {
        id: "img-error",
        name: "bad.jpg",
        url: "error-url",
        dateUploaded: new Date().toISOString(),
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useEditorImage>);

    renderComponent();

    // Assert: Verify that "N/A" is displayed when the image resolution fails to load.
    await waitFor(() => {
      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that missing or empty data fields are correctly replaced by a fallback string.
   */
  it("handles mixed fallback values (N/A) correctly", async () => {
    // Arrange: Mock a case with an empty name and an image with an empty name/missing upload date.
    const partialCaseData = {
      caseName: "",
      caseDate: new Date("2025-01-01"),
      temperatureCelsius: 25,
      locationRegion: "Region",
      locationProvince: "Province",
      locationCity: "City",
      locationBarangay: "Barangay",
    };

    vi.mocked(getCaseById).mockResolvedValue(
      partialCaseData as unknown as Awaited<ReturnType<typeof getCaseById>>
    );

    vi.mocked(useEditorImage).mockReturnValue({
      image: {
        id: "img-incomplete",
        name: "",
        url: "http://example.com/img.jpg",
        dateUploaded: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useEditorImage>);

    renderComponent();

    // Assert: Ensure that the Case Name row displays the fallback "N/A" for empty strings.
    await waitFor(() => {
      const caseNameRow = screen.getByText("Case Name").parentElement;
      expect(caseNameRow).toHaveTextContent("N/A");
    });

    // Assert: Ensure the Image Name row displays the fallback "N/A" for empty strings.
    const imgNameRow = screen.getByText("Image Name").parentElement;
    expect(imgNameRow).toHaveTextContent("N/A");

    // Assert: Ensure the Upload Date row displays the fallback "N/A" for null values.
    const uploadDateRow = screen.getByText("Upload Date").parentElement;
    expect(uploadDateRow).toHaveTextContent("N/A");
  });
});
