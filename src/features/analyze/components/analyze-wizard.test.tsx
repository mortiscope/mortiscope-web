import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCaseUploads } from "@/features/analyze/actions/get-case-uploads";
import { getDraftCase } from "@/features/analyze/actions/get-draft-case";
import { AnalyzeWizard } from "@/features/analyze/components/analyze-wizard";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

// Mock server actions to control data fetching behavior.
vi.mock("@/features/analyze/actions/get-case-uploads");
vi.mock("@/features/analyze/actions/get-draft-case");
// Mock the global state store for the analysis feature.
vi.mock("@/features/analyze/store/analyze-store");

// Mock authentication to bypass session checks.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database connection to prevent side effects.
vi.mock("@/db", () => ({
  db: {},
}));

// Mock the toast notification library to verify error handling.
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock child components to isolate the wizard's routing logic.
vi.mock("@/features/analyze/components/analyze-details", () => ({
  AnalyzeDetails: () => <div>AnalyzeDetails Component</div>,
}));
vi.mock("@/features/analyze/components/analyze-upload", () => ({
  AnalyzeUpload: () => <div>AnalyzeUpload Component</div>,
}));
vi.mock("@/features/analyze/components/analyze-review", () => ({
  AnalyzeReview: () => <div>AnalyzeReview Component</div>,
}));

// Mock loading spinner to verify loading states.
vi.mock("react-spinners", () => ({
  BeatLoader: () => <div data-testid="beat-loader" />,
}));

// Helper function to wrap components with the React Query provider necessary for data fetching hooks.
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  TestWrapper.displayName = "TestWrapper";

  return TestWrapper;
};

/**
 * Groups related tests for the Analyze Wizard component which manages the multi-step analysis workflow.
 */
describe("AnalyzeWizard", () => {
  // Define mock functions for store actions.
  const mockReset = vi.fn();
  const mockSetCaseId = vi.fn();
  const mockUpdateDetailsData = vi.fn();
  const mockHydrateFiles = vi.fn();

  // Define the default state of the analyze store.
  const defaultStoreState = {
    status: "details",
    reset: mockReset,
    caseId: null,
    hydrateFiles: mockHydrateFiles,
    isHydrated: true,
    setCaseId: mockSetCaseId,
    updateDetailsData: mockUpdateDetailsData,
  };

  // Reset mocks and configure default behaviors before each test.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAnalyzeStore).mockReturnValue(defaultStoreState);
    vi.mocked(getDraftCase).mockResolvedValue(null);
    vi.mocked(getCaseUploads).mockResolvedValue({
      success: true,
      data: [],
    } as Awaited<ReturnType<typeof getCaseUploads>>);
  });

  /**
   * Test case to verify that the loading indicator is displayed while the initial draft data is being fetched.
   */
  it("renders loading state initially while fetching draft data", () => {
    // Arrange: Mock the draft retrieval to return a promise that resolves after a delay.
    vi.mocked(getDraftCase).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(null), 100))
    );

    // Act: Render the component wrapped in the QueryClient provider.
    render(<AnalyzeWizard />, { wrapper: createWrapper() });

    // Assert: Check if the loading text and spinner are present in the document.
    expect(screen.getByText("Loading form data...")).toBeInTheDocument();
    expect(screen.getByTestId("beat-loader")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the store is updated with draft case data when it exists on the server.
   */
  it("initializes store with draft case data when found on server", async () => {
    // Arrange: Define mock draft data to be returned by the server action.
    const mockDate = new Date("2025-01-01");
    const mockDraftData = {
      id: "case-123",
      caseName: "Test Draft",
      caseDate: mockDate,
      temperatureCelsius: 25.5,
      locationRegion: "Region 1",
      locationProvince: "Province 1",
      locationCity: "City 1",
      locationBarangay: "Barangay 1",
      notes: "Test notes",
    };

    vi.mocked(getDraftCase).mockResolvedValue(
      mockDraftData as Awaited<ReturnType<typeof getDraftCase>>
    );

    // Act: Render the component.
    render(<AnalyzeWizard />, { wrapper: createWrapper() });

    // Assert: Verify that the case ID was set in the store.
    await waitFor(() => {
      expect(mockSetCaseId).toHaveBeenCalledWith("case-123");
    });

    // Assert: Verify that the details data was mapped and updated in the store correctly.
    expect(mockUpdateDetailsData).toHaveBeenCalledWith({
      caseName: "Test Draft",
      caseDate: mockDate,
      temperature: {
        value: 25.5,
        unit: "C",
      },
      location: {
        region: { name: "Region 1", code: "" },
        province: { name: "Province 1", code: "" },
        city: { name: "City 1", code: "" },
        barangay: { name: "Barangay 1", code: "" },
      },
      notes: "Test notes",
    });

    // Assert: Ensure the default component is rendered after loading.
    await waitFor(() => {
      expect(screen.getByText("AnalyzeDetails Component")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the store is reset if the local state has a case ID but no corresponding draft is found on the server.
   */
  it("resets store if no draft found but local store contains stale caseId", async () => {
    // Arrange: Mock the store to have a stale case ID and the server to return null.
    vi.mocked(useAnalyzeStore).mockReturnValue({
      ...defaultStoreState,
      caseId: "stale-id",
    });
    vi.mocked(getDraftCase).mockResolvedValue(null);

    // Act: Render the component.
    render(<AnalyzeWizard />, { wrapper: createWrapper() });

    // Assert: Verify that the reset action was called to clear stale data.
    await waitFor(() => {
      expect(mockReset).toHaveBeenCalled();
    });

    // Assert: Ensure the component proceeds to render.
    expect(screen.getByText("AnalyzeDetails Component")).toBeInTheDocument();
  });

  /**
   * Test case to verify that existing uploaded files are fetched and hydrated into the store when a case ID is present.
   */
  it("fetches and hydrates uploads when caseId is available after initialization", async () => {
    // Arrange: Mock the store to have a valid case ID.
    vi.mocked(useAnalyzeStore).mockReturnValue({
      ...defaultStoreState,
      caseId: "case-123",
    });

    // Arrange: Mock the uploads fetch action to return successful data.
    const mockUploads = [{ id: "1", key: "image-1.jpg", url: "http://example.com/image-1.jpg" }];
    vi.mocked(getCaseUploads).mockResolvedValue({
      success: true,
      data: mockUploads as unknown as Awaited<ReturnType<typeof getCaseUploads>>["data"],
    } as Awaited<ReturnType<typeof getCaseUploads>>);

    // Act: Render the component.
    render(<AnalyzeWizard />, { wrapper: createWrapper() });

    // Assert: Verify that the hydrateFiles action was called with the fetched data.
    await waitFor(() => {
      expect(mockHydrateFiles).toHaveBeenCalledWith(mockUploads);
    });
  });

  /**
   * Test case to verify that an error toast is displayed if the file upload fetch operation fails.
   */
  it("displays error toast when fetching uploads fails", async () => {
    // Arrange: Mock the store with a case ID.
    vi.mocked(useAnalyzeStore).mockReturnValue({
      ...defaultStoreState,
      caseId: "case-123",
    });

    // Arrange: Mock the uploads fetch action to return an error.
    vi.mocked(getCaseUploads).mockResolvedValue({
      success: false,
      error: "Network error",
    } as Awaited<ReturnType<typeof getCaseUploads>>);

    // Act: Render the component.
    render(<AnalyzeWizard />, { wrapper: createWrapper() });

    // Assert: Verify that the error toast was triggered with the correct message.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network error");
    });
  });

  /**
   * Test case to verify that the upload step component is rendered when the status is set to 'upload'.
   */
  it("renders AnalyzeUpload component when store status is 'upload'", async () => {
    // Arrange: Mock the store status to 'upload'.
    vi.mocked(useAnalyzeStore).mockReturnValue({
      ...defaultStoreState,
      status: "upload",
    });

    // Act: Render the component.
    render(<AnalyzeWizard />, { wrapper: createWrapper() });

    // Assert: Verify the presence of the upload component.
    await waitFor(() => {
      expect(screen.getByText("AnalyzeUpload Component")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the review step component is rendered when the status is set to 'review'.
   */
  it("renders AnalyzeReview component when store status is 'review'", async () => {
    // Arrange: Mock the store status to 'review'.
    vi.mocked(useAnalyzeStore).mockReturnValue({
      ...defaultStoreState,
      status: "review",
    });

    // Act: Render the component.
    render(<AnalyzeWizard />, { wrapper: createWrapper() });

    // Assert: Verify the presence of the review component.
    await waitFor(() => {
      expect(screen.getByText("AnalyzeReview Component")).toBeInTheDocument();
    });
  });

  /**
   * Test case to verify that the review step component persists when the status is set to 'processing'.
   */
  it("renders AnalyzeReview component when store status is 'processing'", async () => {
    // Arrange: Mock the store status to 'processing'.
    vi.mocked(useAnalyzeStore).mockReturnValue({
      ...defaultStoreState,
      status: "processing",
    });

    // Act: Render the component.
    render(<AnalyzeWizard />, { wrapper: createWrapper() });

    // Assert: Verify the presence of the review component (which handles processing UI).
    await waitFor(() => {
      expect(screen.getByText("AnalyzeReview Component")).toBeInTheDocument();
    });
  });
});
