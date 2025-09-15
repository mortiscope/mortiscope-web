import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, type Mock, vi } from "vitest";

import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { deleteUpload } from "@/features/upload/actions/delete-upload";
import { UploadPreview } from "@/features/upload/components/upload-preview";

// Mock the `next/dynamic` function used for lazy loading components.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    loader();
    // Return a functional mock component that simulates the behavior of the dynamic modal.
    return function MockDynamicComponent(props: {
      isOpen: boolean;
      onNext: () => void;
      onPrevious: () => void;
      onSelectFile: (id: string) => void;
      onClose: () => void;
      file?: { id: string; name: string };
    }) {
      // Arrange: Render nothing when the modal is closed.
      if (!props.isOpen) return null;
      // Arrange: Render the mock modal with internal controls and test IDs.
      return (
        <div data-testid="upload-preview-modal">
          <div data-testid="preview-file-name">{props.file?.name}</div>
          <button onClick={props.onNext}>Next</button>
          <button onClick={props.onPrevious}>Previous</button>
          <button onClick={() => props.onSelectFile("2")}>Select File 2</button>
          <button onClick={() => props.onSelectFile("invalid-id")}>Select Invalid File</button>
          <button onClick={props.onClose}>Close</button>
        </div>
      );
    };
  },
}));

// Mock function to track query invalidation calls.
const mockInvalidateQueries = vi.fn();
// Mock the `react-query` hooks, specifically `useQueryClient` and `useMutation`.
vi.mock("@tanstack/react-query", () => ({
  // Arrange: Mock `useQueryClient` to return the `invalidateQueries` tracker.
  useQueryClient: vi.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
  // Arrange: Mock `useMutation` to immediately execute the `mutationFn` and call `onSuccess` or `onError` synchronously.
  useMutation: ({
    mutationFn,
    onSuccess,
    onError,
    onSettled,
  }: {
    mutationFn: (variables: unknown) => Promise<unknown>;
    onSuccess: (data: unknown, variables: unknown) => void;
    onError?: (error: unknown) => void;
    onSettled?: () => void;
  }) => ({
    mutate: (variables: unknown) => {
      mutationFn(variables)
        .then((result) => {
          onSuccess(result, variables);
        })
        .catch((error) => {
          if (onError) onError(error);
        })
        .finally(() => {
          if (onSettled) onSettled();
        });
    },
  }),
}));

// Mock the `sonner` toast notification library to track success and error messages.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock `framer-motion` components to simplify the DOM structure and focus on logic.
vi.mock("framer-motion", () => ({
  // Arrange: Mock `AnimatePresence` to directly render its children.
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    // Arrange: Mock `motion.div` as a regular div element.
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock the Zustand store hook used to manage global state.
vi.mock("@/features/analyze/store/analyze-store", () => ({
  useAnalyzeStore: vi.fn(),
}));

// Mock the server action for deleting an upload.
vi.mock("@/features/upload/actions/delete-upload", () => ({
  deleteUpload: vi.fn(),
}));

// Mock the `UploadFileList` component, abstracting its rendering and interaction logic.
vi.mock("@/features/upload/components/upload-file-list", () => ({
  UploadFileList: ({
    files,
    onViewFile,
    onDeleteFile,
  }: {
    files: Array<{ id: string; name: string; key?: string }>;
    onViewFile: (file: { id: string }) => void;
    onDeleteFile: (id: string, key: string | null) => void;
  }) => (
    // Arrange: Render a test container for the file list.
    <div data-testid="upload-file-list">
      {files.map((f) => (
        // Arrange: Render mock file items with view and delete buttons to trigger props callbacks.
        <div key={f.id} data-testid={`file-item-${f.id}`} data-name={f.name}>
          <span>{f.name}</span>
          <button onClick={() => onViewFile(f)}>View {f.name}</button>
          <button onClick={() => onDeleteFile(f.id, f.key || null)}>Delete {f.name}</button>
        </div>
      ))}
      {/* Arrange: Add a button to test local deletion when no S3 key is present. */}
      <button onClick={() => onDeleteFile("phantom-id", null)}>Delete Phantom Local</button>
    </div>
  ),
}));

// Mock the `UploadToolbar` component, abstracting its controls.
vi.mock("@/features/upload/components/upload-toolbar", () => ({
  UploadToolbar: ({
    onSearchTermChange,
    onSortOptionChange,
    onViewModeChange,
  }: {
    onSearchTermChange: (term: string) => void;
    onSortOptionChange: (opt: string) => void;
    onViewModeChange: (mode: string) => void;
  }) => (
    // Arrange: Render a test container for the toolbar.
    <div data-testid="upload-toolbar">
      {/* Arrange: Render a search input to trigger the `onSearchTermChange` callback. */}
      <input
        data-testid="search-input"
        onChange={(e) => onSearchTermChange(e.target.value)}
        placeholder="Search files"
      />
      {/* Arrange: Render buttons to trigger view mode and sort option changes. */}
      <button onClick={() => onSortOptionChange("size-asc")}>Sort Size Asc</button>
      <button onClick={() => onViewModeChange("list")}>View List</button>
    </div>
  ),
}));

// Mock the component displayed when search results are empty.
vi.mock("@/features/upload/components/upload-no-results", () => ({
  UploadNoResults: () => <div data-testid="upload-no-results" />,
}));

import { toast } from "sonner";

/**
 * Test suite for the `UploadPreview` component, covering file display, sorting, filtering, and deletion.
 */
describe("UploadPreview", () => {
  // Mock functions for state management actions in the store.
  const mockRemoveFile = vi.fn();
  const mockSetSearchTerm = vi.fn();
  const mockSetSortOption = vi.fn();
  const mockSetViewMode = vi.fn();
  const mockRetryUpload = vi.fn();

  // Define a consistent set of test file data.
  const filesData = [
    {
      id: "1",
      name: "instar-2.jpg",
      size: 5000,
      dateUploaded: new Date("2025-01-01"),
      key: "key-1",
    },
    { id: "2", name: "instar-3.jpg", size: 1000, dateUploaded: new Date("2025-01-02") },
    {
      id: "3",
      name: "instar-1.jpg",
      size: 3000,
      dateUploaded: new Date("2025-01-03"),
      key: "key-3",
    },
  ];

  // Define the default mock state returned by `useAnalyzeStore`.
  const defaultStoreState = {
    data: {
      files: filesData,
    },
    caseId: "case-123",
    viewMode: "grid",
    sortOption: "date-modified-desc",
    searchTerm: "",
    setViewMode: mockSetViewMode,
    setSortOption: mockSetSortOption,
    setSearchTerm: mockSetSearchTerm,
    removeFile: mockRemoveFile,
    retryUpload: mockRetryUpload,
  };

  // Set up the default store state mock before each test run.
  beforeEach(() => {
    vi.clearAllMocks();
    (useAnalyzeStore as unknown as Mock).mockReturnValue(defaultStoreState);
  });

  /**
   * Test case to ensure nothing is rendered when the file list in the store is empty.
   */
  it("renders nothing if file list is empty", () => {
    // Arrange: Mock the store to contain an empty files array.
    (useAnalyzeStore as unknown as Mock).mockReturnValue({
      ...defaultStoreState,
      data: { files: [] },
    });

    // Act: Render the component.
    const { container } = render(<UploadPreview />);
    // Assert: Verify that the container element is empty.
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Test case to ensure the main file list and toolbar components are rendered when files are present.
   */
  it("renders the file list and toolbar when files exist", () => {
    // Arrange/Act: Render the component with default files data.
    render(<UploadPreview />);
    // Assert: Verify the presence of the file list component.
    expect(screen.getByTestId("upload-file-list")).toBeInTheDocument();
    // Assert: Verify the presence of the toolbar component.
    expect(screen.getByTestId("upload-toolbar")).toBeInTheDocument();
  });

  /**
   * Test case to verify that clicking a "View" button opens the preview modal and displays the correct file name.
   */
  it("opens the preview modal when a file is viewed", () => {
    // Arrange/Act: Render the component.
    render(<UploadPreview />);
    // Act: Find and click the button to view a specific file.
    const viewButton = screen.getByText("View instar-2.jpg");
    fireEvent.click(viewButton);
    // Assert: Verify the mock preview modal is rendered.
    expect(screen.getByTestId("upload-preview-modal")).toBeInTheDocument();
    // Assert: Verify the file name displayed in the modal is correct.
    expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-2.jpg");
  });

  /**
   * Test suite dedicated to verifying all supported file sorting options.
   */
  describe("Sorting Logic", () => {
    /**
     * Test case for sorting files alphabetically by name in ascending order.
     */
    it("sorts by name ascending", () => {
      // Arrange: Set the sort option in the store to "name-asc".
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        sortOption: "name-asc",
      });
      // Act: Render the component.
      render(<UploadPreview />);
      // Assert: Check the order of the rendered file items by their name attributes.
      const items = screen.getAllByTestId(/^file-item-/);
      expect(items[0]).toHaveAttribute("data-name", "instar-1.jpg");
      expect(items[1]).toHaveAttribute("data-name", "instar-2.jpg");
      expect(items[2]).toHaveAttribute("data-name", "instar-3.jpg");
    });

    /**
     * Test case for sorting files alphabetically by name in descending order.
     */
    it("sorts by name descending", () => {
      // Arrange: Set the sort option in the store to "name-desc".
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        sortOption: "name-desc",
      });
      // Act: Render the component.
      render(<UploadPreview />);
      // Assert: Check the reverse alphabetical order of file names.
      const items = screen.getAllByTestId(/^file-item-/);
      expect(items[0]).toHaveAttribute("data-name", "instar-3.jpg");
      expect(items[1]).toHaveAttribute("data-name", "instar-2.jpg");
      expect(items[2]).toHaveAttribute("data-name", "instar-1.jpg");
    });

    /**
     * Test case for sorting files numerically by size in ascending order.
     */
    it("sorts by size ascending", () => {
      // Arrange: Set the sort option in the store to "size-asc".
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        sortOption: "size-asc",
      });
      // Act: Render the component.
      render(<UploadPreview />);
      // Assert: Check the order of file names corresponding to size (1000, 3000, 5000).
      const items = screen.getAllByTestId(/^file-item-/);
      expect(items[0]).toHaveAttribute("data-name", "instar-3.jpg");
      expect(items[1]).toHaveAttribute("data-name", "instar-1.jpg");
      expect(items[2]).toHaveAttribute("data-name", "instar-2.jpg");
    });

    /**
     * Test case for sorting files numerically by size in descending order.
     */
    it("sorts by size descending", () => {
      // Arrange: Set the sort option in the store to "size-desc".
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        sortOption: "size-desc",
      });
      // Act: Render the component.
      render(<UploadPreview />);
      // Assert: Check the order of file names corresponding to size (5000, 3000, 1000).
      const items = screen.getAllByTestId(/^file-item-/);
      expect(items[0]).toHaveAttribute("data-name", "instar-2.jpg");
      expect(items[1]).toHaveAttribute("data-name", "instar-1.jpg");
      expect(items[2]).toHaveAttribute("data-name", "instar-3.jpg");
    });

    /**
     * Test case for sorting files chronologically by date modified (uploaded) in ascending order.
     */
    it("sorts by date modified ascending", () => {
      // Arrange: Set the sort option in the store to "date-modified-asc".
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        sortOption: "date-modified-asc",
      });
      // Act: Render the component.
      render(<UploadPreview />);
      // Assert: Check the order of file names corresponding to date (01-01, 01-02, 01-03).
      const items = screen.getAllByTestId(/^file-item-/);
      expect(items[0]).toHaveAttribute("data-name", "instar-2.jpg");
      expect(items[1]).toHaveAttribute("data-name", "instar-3.jpg");
      expect(items[2]).toHaveAttribute("data-name", "instar-1.jpg");
    });

    /**
     * Test case for sorting files chronologically by date modified (uploaded) in descending order (default).
     */
    it("sorts by date modified descending (default)", () => {
      // Arrange: Set the sort option in the store to the default value.
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        sortOption: "date-modified-desc",
      });
      // Act: Render the component.
      render(<UploadPreview />);
      // Assert: Check the order of file names corresponding to date (01-03, 01-02, 01-01).
      const items = screen.getAllByTestId(/^file-item-/);
      expect(items[0]).toHaveAttribute("data-name", "instar-1.jpg");
      expect(items[1]).toHaveAttribute("data-name", "instar-3.jpg");
      expect(items[2]).toHaveAttribute("data-name", "instar-2.jpg");
    });

    /**
     * Test case to ensure the component falls back to the default sort when an invalid option is provided.
     */
    it("falls back to default sort (date-modified-desc) for unknown option", () => {
      // Arrange: Set an unknown sort option in the store.
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        sortOption: "unknown-option",
      });
      // Act: Render the component.
      render(<UploadPreview />);
      // Assert: Check that the order matches the default "date-modified-desc" sort.
      const items = screen.getAllByTestId(/^file-item-/);
      expect(items[0]).toHaveAttribute("data-name", "instar-1.jpg");
      expect(items[1]).toHaveAttribute("data-name", "instar-3.jpg");
      expect(items[2]).toHaveAttribute("data-name", "instar-2.jpg");
    });
  });

  /**
   * Test case to verify that the file list correctly filters files based on a search term.
   */
  it("filters files based on search term (case-insensitive)", () => {
    // Arrange: Set a specific search term in the store.
    (useAnalyzeStore as unknown as Mock).mockReturnValue({
      ...defaultStoreState,
      searchTerm: "instar-3",
    });
    // Act: Render the component.
    render(<UploadPreview />);

    // Assert: Verify that only one file matching the search term is rendered.
    const items = screen.getAllByTestId(/^file-item-/);
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAttribute("data-name", "instar-3.jpg");
  });

  /**
   * Test suite for interactions within the file preview modal.
   */
  describe("Modal Interactions", () => {
    // Set a consistent sort order for navigation tests to ensure predictable indexing.
    beforeEach(() => {
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        sortOption: "date-modified-asc", // Order: 2, 3, 1 (instar-2.jpg, instar-3.jpg, instar-1.jpg)
      });
    });

    /**
     * Test case to verify that the "Next" and "Previous" buttons correctly cycle through the sorted file list.
     */
    it("navigates to the next and previous file", () => {
      // Arrange/Act: Render the component.
      render(<UploadPreview />);
      // Act: Open the modal on the middle file (`instar-3.jpg`).
      fireEvent.click(screen.getByText("View instar-3.jpg"));
      expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-3.jpg");

      // Act: Click "Next" to move to the last file (`instar-1.jpg`).
      fireEvent.click(screen.getByText("Next"));
      expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-1.jpg");

      // Act: Click "Previous" to move back to the middle file (`instar-3.jpg`).
      fireEvent.click(screen.getByText("Previous"));
      expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-3.jpg");

      // Act: Click "Previous" again to move to the first file (`instar-2.jpg`).
      fireEvent.click(screen.getByText("Previous"));
      expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-2.jpg");
    });

    /**
     * Test case to verify that navigation stops at the first and last files in the sorted list.
     */
    it("respects navigation boundaries", () => {
      // Arrange/Act: Render the component.
      render(<UploadPreview />);
      // Act: Open the modal on the first file (`instar-2.jpg`).
      fireEvent.click(screen.getByText("View instar-2.jpg"));
      // Act: Try to navigate "Previous" past the first file.
      fireEvent.click(screen.getByText("Previous"));
      // Assert: Verify that the file remains unchanged at the first index.
      expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-2.jpg");

      // Act: Navigate forward to the last file (`instar-1.jpg`).
      fireEvent.click(screen.getByText("Next"));
      fireEvent.click(screen.getByText("Next"));

      // Act: Try to navigate "Next" past the last file.
      fireEvent.click(screen.getByText("Next"));
      // Assert: Verify that the file remains unchanged at the last index.
      expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-1.jpg");
    });

    /**
     * Test case to verify that selecting a file from the modal's internal strip updates the current preview file.
     */
    it("updates viewing file when selecting from modal strip", () => {
      // Arrange/Act: Render the component and open the modal on `instar-2.jpg`.
      render(<UploadPreview />);
      fireEvent.click(screen.getByText("View instar-2.jpg"));

      // Act: Click the mock button to select file ID "2" (`instar-3.jpg`).
      fireEvent.click(screen.getByText("Select File 2"));
      // Assert: Verify that the preview file name has changed to the newly selected file.
      expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-3.jpg");
    });

    /**
     * Test case to verify that the close button correctly dismisses the modal.
     */
    it("closes the modal when close button is clicked", () => {
      // Arrange/Act: Render the component and open the modal.
      render(<UploadPreview />);
      fireEvent.click(screen.getByText("View instar-2.jpg"));
      expect(screen.getByTestId("upload-preview-modal")).toBeInTheDocument();

      // Act: Click the close button.
      fireEvent.click(screen.getByText("Close"));

      // Assert: Verify that the mock modal element is removed from the DOM.
      expect(screen.queryByTestId("upload-preview-modal")).not.toBeInTheDocument();
    });
  });

  /**
   * Test suite for interactions originating from the `UploadToolbar`.
   */
  describe("Toolbar Interactions", () => {
    /**
     * Test case to verify that sorting changes initiated from the toolbar update the store.
     */
    it("updates sort option when changed in toolbar", () => {
      // Arrange/Act: Render the component.
      render(<UploadPreview />);
      // Act: Click the mock sort button in the toolbar.
      fireEvent.click(screen.getByText("Sort Size Asc"));
      // Assert: Verify that the store action `mockSetSortOption` was called with the new value.
      expect(mockSetSortOption).toHaveBeenCalledWith("size-asc");
    });

    /**
     * Test case to verify that view mode changes initiated from the toolbar update the store.
     */
    it("updates view mode when changed in toolbar", () => {
      // Arrange/Act: Render the component.
      render(<UploadPreview />);
      // Act: Click the mock view mode button in the toolbar.
      fireEvent.click(screen.getByText("View List"));
      // Assert: Verify that the store action `mockSetViewMode` was called with the new value.
      expect(mockSetViewMode).toHaveBeenCalledWith("list");
    });
  });

  /**
   * Test suite for the file deletion process.
   */
  describe("Deletion Flow", () => {
    /**
     * Test case for deleting a file that only exists locally.
     */
    it("displays success toast for local deletion", () => {
      // Arrange/Act: Render the component.
      render(<UploadPreview />);
      // Act: Click the delete button for a file without an S3 key.
      fireEvent.click(screen.getByText("Delete instar-3.jpg"));
      // Assert: Verify that the local store removal action was called.
      expect(mockRemoveFile).toHaveBeenCalledWith("2");
      // Assert: Verify that a success toast was displayed for local removal.
      expect(toast.success).toHaveBeenCalledWith("instar-3.jpg removed.");
    });

    /**
     * Test case for successful deletion of a server-side file.
     */
    it("handles server file deletion success (toast + invalidation)", async () => {
      // Arrange: Mock the `deleteUpload` server action to return success.
      (deleteUpload as unknown as Mock).mockResolvedValue({ success: true });
      // Arrange/Act: Render the component.
      render(<UploadPreview />);

      // Act: Click the delete button for a file with an S3 key (`instar-1.jpg`).
      fireEvent.click(screen.getByText("Delete instar-1.jpg"));

      // Assert: Wait for asynchronous mutation to complete and verify side effects.
      await waitFor(() => {
        // Assert: Verify that the server action was called with the file's S3 key.
        expect(deleteUpload).toHaveBeenCalledWith({ key: "key-3" });
        // Assert: Verify that the local store removal action was called.
        expect(mockRemoveFile).toHaveBeenCalledWith("3");
        // Assert: Verify that a success toast was displayed.
        expect(toast.success).toHaveBeenCalledWith("instar-1.jpg deleted successfully.");
        // Assert: Verify that the relevant React Query cache was invalidated to refetch data.
        expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["uploads", "case-123"] });
      });
    });

    /**
     * Test case for handling a network or rejection error during server-side deletion.
     */
    it("displays error toast if server delete fails", async () => {
      // Arrange: Mock the `deleteUpload` server action to throw an error.
      (deleteUpload as unknown as Mock).mockRejectedValue(new Error("Network Error"));
      // Arrange/Act: Render the component.
      render(<UploadPreview />);

      // Act: Click the delete button for a server file.
      fireEvent.click(screen.getByText("Delete instar-1.jpg"));

      // Assert: Wait for the error handling to complete and verify the error toast is shown.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Network Error");
      });
    });

    /**
     * Test case for handling a business logic failure returned by the server action.
     */
    it("displays error toast if deleteUpload returns success: false", async () => {
      // Arrange: Mock the server action to return an explicit failure message.
      (deleteUpload as unknown as Mock).mockResolvedValue({
        success: false,
        error: "Access Denied",
      });
      // Arrange/Act: Render the component.
      render(<UploadPreview />);

      // Act: Click the delete button for a server file.
      fireEvent.click(screen.getByText("Delete instar-1.jpg"));

      // Assert: Wait for the asynchronous call and verify that the specific error message is toasted.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Access Denied");
      });
    });
  });

  /**
   * Test suite for less common scenarios and branch coverage.
   */
  describe("Edge Case & Branch Coverage", () => {
    /**
     * Test case to verify that the "No Results" component is rendered when filtering yields no matches.
     */
    it("renders 'No Results' when search term yields no matches", () => {
      // Arrange: Set a search term that will not match any file.
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        searchTerm: "nomatch",
        data: { files: filesData },
      });
      // Act: Render the component.
      render(<UploadPreview />);
      // Assert: Verify that the "No Results" component is present.
      expect(screen.getByTestId("upload-no-results")).toBeInTheDocument();
      // Assert: Verify that the file list component is not present.
      expect(screen.queryByTestId("upload-file-list")).not.toBeInTheDocument();
    });

    /**
     * Test case to ensure invalid file ID selections within the modal are gracefully ignored.
     */
    it("ignores selection of invalid file ID from modal", () => {
      // Arrange/Act: Render the component and open the modal on `instar-2.jpg`.
      render(<UploadPreview />);
      fireEvent.click(screen.getByText("View instar-2.jpg"));

      // Act: Click the mock button that attempts to select an invalid file ID.
      fireEvent.click(screen.getByText("Select Invalid File"));

      // Assert: Verify that the preview file name remains unchanged.
      expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-2.jpg");
    });

    /**
     * Test case to ensure a success toast is only shown if a locally deleted file actually existed in the store.
     */
    it("does not show success toast if locally deleted file is not found", () => {
      // Arrange/Act: Render the component.
      render(<UploadPreview />);
      // Act: Click the button that attempts to delete a file that is not in the list.
      fireEvent.click(screen.getByText("Delete Phantom Local"));

      // Assert: Verify that the removal attempt was made in the store.
      expect(mockRemoveFile).toHaveBeenCalledWith("phantom-id");
      // Assert: Verify that no success toast was shown, as the file name could not be retrieved.
      expect(toast.success).not.toHaveBeenCalled();
    });

    /**
     * Test case to ensure that when the file currently being viewed is filtered out, modal navigation behavior is consistent.
     */
    it("does not navigate if current viewing file is filtered out", () => {
      // Arrange: Render the component initially.
      const { rerender } = render(<UploadPreview />);
      // Act: Open the modal on `instar-3.jpg`.
      fireEvent.click(screen.getByText("View instar-3.jpg"));
      expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-3.jpg");

      // Arrange: Update the store to filter the list so only `instar-1.jpg` remains.
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        searchTerm: "instar-1",
      });

      // Act: Rerender the component with the new filtered list.
      rerender(<UploadPreview />);

      // Act: Attempt to navigate to the "Next" file.
      fireEvent.click(screen.getByText("Next"));

      // Assert: Verify that the viewing file is unchanged because the current file is not in the new filtered navigation array.
      expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-3.jpg");
    });
  });
});
