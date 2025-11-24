import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@/__tests__/setup/test-utils";

// Mock the database import since it is not used in the hook itself.
vi.mock("@/db", () => ({
  db: {},
}));

// Mock the environment variables used for generating URLs.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

// Mock authentication functions as they are typically provided globally.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

import { toast } from "sonner";

import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useAnalysisSubmission } from "@/features/cases/hooks/use-analysis-submission";
import { useAnalyzeReview } from "@/features/cases/hooks/use-analyze-review";
import { useSelectionNavigator } from "@/features/cases/hooks/use-selection-navigator";
import { useAnalysisStatus } from "@/features/results/hooks/use-analysis-status";

// Mock the Zustand store hook for controlling case data and state.
vi.mock("@/features/analyze/store/analyze-store");

// Mock related custom hooks to isolate the logic of `useAnalyzeReview`.
vi.mock("@/features/cases/hooks/use-analysis-submission");
vi.mock("@/features/cases/hooks/use-selection-navigator");
vi.mock("@/features/results/hooks/use-analysis-status");

// Mock the `sonner` toast utility to spy on error messages.
vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

// Mock global URL methods used for local file previews.
const createObjectURLMock = vi.fn();
const revokeObjectURLMock = vi.fn();

// Replace the global URL methods with mocks for testing `createObjectURL` and `revokeObjectURL`.
global.URL.createObjectURL = createObjectURLMock;
global.URL.revokeObjectURL = revokeObjectURLMock;

// Define a partial interface for mock file data structure.
interface MockFilePartial {
  id: string;
  name: string;
  dateUploaded: Date;
  status: string;
  url?: string;
  file?: File;
  version?: number;
}

// Define mock data for a list of files, including remote and local representations.
const mockFilesRaw: MockFilePartial[] = [
  {
    id: "file-1",
    name: "image-2.jpg",
    dateUploaded: new Date("2025-01-02"),
    status: "success",
    url: "http://remote/image-2.jpg",
  },
  {
    id: "file-2",
    name: "image-1.jpg",
    dateUploaded: new Date("2025-01-01"),
    status: "success",
    file: new File([], "image-1.jpg"),
  },
];

// Cast the raw mock data to the expected type for use in the tests.
const mockFiles = mockFilesRaw as unknown as UploadableFile[];

// Define mock data for the case details, including location and temperature.
const mockDetails = {
  caseName: "Test Case",
  temperature: { value: 25, unit: "C" },
  caseDate: new Date("2025-01-01"),
  location: {
    barangay: { name: "Barangay A", code: "PH010101" },
    city: { name: "City B", code: "PH0101" },
    province: { name: "Province C", code: "PH01" },
    region: { name: "Region D", code: "PH" },
  },
};

/**
 * Test suite for the `useAnalyzeReview` hook.
 */
describe("useAnalyzeReview", () => {
  // Mock functions returned by the submission hook.
  const submitMock = vi.fn();
  const cancelMock = vi.fn();
  // Mock function from the `useAnalyzeStore` for navigating to the previous step.
  const prevStepMock = vi.fn();

  // Setup for all tests, ensuring clean state and mock configurations.
  beforeEach(() => {
    // Arrange: Clear all previous mock calls.
    vi.clearAllMocks();

    // Arrange: Mock the `useAnalyzeStore` to return defined mock state for the review step.
    vi.mocked(useAnalyzeStore).mockReturnValue({
      details: mockDetails,
      data: { files: mockFiles },
      caseId: "case-123",
      status: "review",
      prevStep: prevStepMock,
    } as unknown as ReturnType<typeof useAnalyzeStore>);

    // Arrange: Mock the `useAnalysisSubmission` hook to return mock submit/cancel functions.
    vi.mocked(useAnalysisSubmission).mockReturnValue({
      submit: submitMock,
      cancel: cancelMock,
      isSubmitting: false,
      isCancelling: false,
    } as unknown as ReturnType<typeof useAnalysisSubmission>);

    // Arrange: Mock the `useSelectionNavigator` hook with a closed state.
    vi.mocked(useSelectionNavigator).mockReturnValue({
      isOpen: false,
      activeItem: null,
    } as unknown as ReturnType<typeof useSelectionNavigator>);

    // Arrange: Mock the `useAnalysisStatus` hook with an undefined status.
    vi.mocked(useAnalysisStatus).mockReturnValue({
      status: undefined,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useAnalysisStatus>);

    // Arrange: Configure the mock `createObjectURL` to return a predictable string.
    createObjectURLMock.mockReturnValue("blob:local-url");
  });

  // Teardown to restore all original mock implementations.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test case to verify that the hook correctly formats raw data into user-friendly display strings.
   */
  it("returns formatted display data correctly", () => {
    // Act: Render the hook.
    const { result } = renderHook(() => useAnalyzeReview());

    // Assert: Check that the returned `displayData` object matches the expected formatted output.
    expect(result.current.displayData).toEqual({
      caseName: "Test Case",
      temperatureDisplay: "25.0 °C",
      caseDateDisplay: "January 1, 2025",
      locationDisplay: "Barangay A, City B, Province C, Region D",
    });
  });

  /**
   * Test case to verify that files are sorted by their `dateUploaded` field in descending order (most recent first).
   */
  it("sorts files by dateUploaded descending", () => {
    // Act: Render the hook.
    const { result } = renderHook(() => useAnalyzeReview());

    // Assert: Check that the resulting file IDs are in the correct descending chronological order.
    const sortedIds = result.current.sortedFiles.map((f: UploadableFile) => f.id);
    expect(sortedIds).toEqual(["file-1", "file-2"]);
  });

  /**
   * Test case to verify that `createObjectURL` is called only for local files containing a `File` object.
   */
  it("generates object URLs for local files only", async () => {
    // Act: Render the hook, which triggers the `useEffect` to create object URLs.
    renderHook(() => useAnalyzeReview());

    // Assert: Wait for the effect to complete and check that `createObjectURL` was called exactly once.
    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    });
    // Assert: Check that the call was made specifically with the `File` object from the second mock file.
    expect(createObjectURLMock).toHaveBeenCalledWith(mockFiles[1].file);
  });

  /**
   * Test case to verify that the generated object URLs are revoked upon component unmount for cleanup.
   */
  it("revokes object URLs on unmount", async () => {
    // Arrange: Render the hook and capture the `unmount` function.
    const { unmount } = renderHook(() => useAnalyzeReview());

    // Arrange: Wait for the object URL to be created.
    await waitFor(() => {
      expect(createObjectURLMock).toHaveBeenCalled();
    });

    // Act: Unmount the hook component, triggering the cleanup function.
    unmount();
    // Assert: Check that `revokeObjectURL` was called with the mock blob URL.
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:local-url");
  });

  /**
   * Test suite for the `getPreviewUrl` utility function returned by the hook.
   */
  describe("getPreviewUrl", () => {
    /**
     * Test case to verify that the remote URL is returned directly from the presigned URL.
     */
    it("returns remote URL directly without cache-busting", () => {
      // Act: Render the hook.
      const { result } = renderHook(() => useAnalyzeReview());

      // Arrange: Create a mock file object with a remote URL and a version.
      const fileWithVersion = { ...mockFiles[0], version: 1 } as unknown as UploadableFile;

      // Assert: Check that the returned URL is used directly without a version query parameter.
      const url = result.current.getPreviewUrl(fileWithVersion);
      expect(url).toBe("http://remote/image-2.jpg");
    });

    /**
     * Test case to verify that the local blob URL is returned when a remote URL is not present.
     */
    it("returns local blob URL if remote URL is missing", async () => {
      // Act: Render the hook.
      const { result } = renderHook(() => useAnalyzeReview());
      // Arrange: Wait for the local URL creation to ensure the effect has run.
      await waitFor(() => {
        expect(createObjectURLMock).toHaveBeenCalled();
      });

      // Arrange: Select the local file object.
      const localFile = mockFiles[1];
      // Assert: Check that the returned URL is the mock local blob URL.
      const url = result.current.getPreviewUrl(localFile);
      expect(url).toBe("blob:local-url");
    });
  });

  /**
   * Test suite for the `handleSubmit` function.
   */
  describe("handleSubmit", () => {
    /**
     * Test case to verify that submission is called when all validation checks pass.
     */
    it("calls submit if validation passes", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalyzeReview());

      // Act: Execute the submission attempt within `act` since it triggers a state change.
      act(() => {
        result.current.handleSubmit();
      });

      // Assert: Check that the mock submission function was called and no error toast was displayed.
      expect(submitMock).toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that submission is blocked if the file list is empty.
     */
    it("blocks submission if files are missing", () => {
      // Arrange: Mock the store to return an empty file array.
      vi.mocked(useAnalyzeStore).mockReturnValue({
        details: mockDetails,
        data: { files: [] },
        caseId: "case-123",
      } as unknown as ReturnType<typeof useAnalyzeStore>);

      const { result } = renderHook(() => useAnalyzeReview());

      // Act: Execute the submission attempt.
      act(() => {
        result.current.handleSubmit();
      });

      // Assert: Check that submission was blocked and an error toast concerning missing images was shown.
      expect(submitMock).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("ensure all images"));
    });

    /**
     * Test case to verify that submission is blocked if any file is not in the "success" upload status.
     */
    it("blocks submission if file uploads are pending/failed", () => {
      // Arrange: Mock the store with a file whose status is "pending".
      vi.mocked(useAnalyzeStore).mockReturnValue({
        details: mockDetails,
        data: { files: [{ ...mockFiles[0], status: "pending" }] },
      } as unknown as ReturnType<typeof useAnalyzeStore>);

      const { result } = renderHook(() => useAnalyzeReview());

      // Act: Execute the submission attempt.
      act(() => {
        result.current.handleSubmit();
      });

      // Assert: Check that submission was blocked and an error toast concerning incomplete uploads was shown.
      expect(submitMock).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("ensure all images"));
    });

    /**
     * Test case to verify that submission is blocked if the form details contain invalid or missing required data.
     */
    it("blocks submission if form details are invalid (e.g. missing name)", () => {
      // Arrange: Mock the store with an invalid `caseName`.
      vi.mocked(useAnalyzeStore).mockReturnValue({
        details: { ...mockDetails, caseName: "" },
        data: { files: mockFiles },
      } as unknown as ReturnType<typeof useAnalyzeStore>);

      const { result } = renderHook(() => useAnalyzeReview());

      // Act: Execute the submission attempt.
      act(() => {
        result.current.handleSubmit();
      });

      // Assert: Check that submission was blocked and an error toast concerning form validation was shown.
      expect(submitMock).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Form data is invalid"));
    });

    /**
     * Test case to verify that submission is blocked if the analysis state is already in a "processing" status.
     */
    it("blocks submission if already processing", () => {
      // Arrange: Mock the store to return a status of "processing".
      vi.mocked(useAnalyzeStore).mockReturnValue({
        details: mockDetails,
        data: { files: mockFiles },
        status: "processing",
      } as unknown as ReturnType<typeof useAnalyzeStore>);

      const { result } = renderHook(() => useAnalyzeReview());

      // Act: Execute the submission attempt.
      act(() => {
        result.current.handleSubmit();
      });

      // Assert: Check that the mock submission function was not called because of the internal status check.
      expect(submitMock).not.toHaveBeenCalled();
    });
  });

  /**
   * Test suite for the logic governing the processing message display.
   */
  describe("Processing State", () => {
    /**
     * Test case to verify that a specific message is returned when the analysis status is "processing".
     */
    it("returns correct processing message based on status", () => {
      // Arrange: Mock the status hook to return a status of "processing".
      vi.mocked(useAnalysisStatus).mockReturnValue({
        status: "processing",
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useAnalysisStatus>);

      // Act: Render the hook.
      const { result } = renderHook(() => useAnalyzeReview());
      // Assert: Check that the expected message for running analysis is returned.
      expect(result.current.processingMessage).toBe("Running analysis on the backend...");
    });

    /**
     * Test case to verify that the default message is returned when the analysis status is undefined or unknown.
     */
    it("returns default message if status is undefined/unknown", () => {
      // Arrange: Mock the status hook to return an undefined status.
      vi.mocked(useAnalysisStatus).mockReturnValue({
        status: undefined,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useAnalysisStatus>);

      // Act: Render the hook.
      const { result } = renderHook(() => useAnalyzeReview());
      // Assert: Check that the default initialization message is returned.
      expect(result.current.processingMessage).toBe("Initializing analysis...");
    });
  });
});
