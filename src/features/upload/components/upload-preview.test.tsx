import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { mockUploads } from "@/__tests__/mocks/fixtures/uploads.fixtures";
import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { deleteUpload } from "@/features/upload/actions/delete-upload";
import { updateUpload } from "@/features/upload/actions/update-upload";
import { UploadPreview } from "@/features/upload/components/upload-preview";

// Mock the `next/dynamic` function used for lazy loading components.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    const loaderStr = loader.toString();
    if (loaderStr.includes("image-type-modal")) {
      return function MockImageTypeModal(props: Record<string, unknown>) {
        const { isOpen, file, onConfirm, onOpenChange } = props as {
          isOpen: boolean;
          file: { id: string } | null;
          onConfirm: (id: string, type: string) => void;
          onOpenChange: (open: boolean) => void;
        };
        if (!isOpen) return null;
        return (
          <div data-testid="image-type-modal">
            <button onClick={() => onConfirm(file?.id ?? "", "macro")}>Confirm Macro</button>
            <button onClick={() => onConfirm(file?.id ?? "", "field")}>Confirm Field</button>
            <button onClick={() => onConfirm("nonexistent-id", "macro")}>Confirm Unknown</button>
            <button onClick={() => onOpenChange(false)}>Close Image Type</button>
            <button onClick={() => onOpenChange(true)}>Keep Open</button>
          </div>
        );
      };
    }

    // Default to the upload preview modal mock
    return function MockDynamicComponent(props: Record<string, unknown>) {
      const { isOpen, file, onNext, onPrevious, onSelectFile, onClose } = props as {
        isOpen: boolean;
        file: { name: string } | null;
        onNext: () => void;
        onPrevious: () => void;
        onSelectFile: (id: string) => void;
        onClose: () => void;
      };
      if (!isOpen) return null;
      return (
        <div data-testid="upload-preview-modal">
          <div data-testid="preview-file-name">{file?.name}</div>
          <button onClick={onNext}>Next</button>
          <button onClick={onPrevious}>Previous</button>
          <button onClick={() => onSelectFile("2")}>Select File 2</button>
          <button onClick={() => onSelectFile("invalid-id")}>Select Invalid File</button>
          <button onClick={onClose}>Close</button>
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
  deleteUpload: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock the server action for updating an upload.
vi.mock("@/features/upload/actions/update-upload", () => ({
  updateUpload: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock the `UploadFileList` component, abstracting its rendering and interaction logic.
vi.mock("@/features/upload/components/upload-file-list", () => ({
  UploadFileList: ({
    files,
    onViewFile,
    onDeleteFile,
    onSetImageType,
  }: {
    files: Array<{ id: string; name: string; key?: string }>;
    onViewFile: (file: { id: string }) => void;
    onDeleteFile: (id: string, key: string | null) => void;
    onSetImageType?: (file: { id: string }) => void;
  }) => (
    // Arrange: Render a test container for the file list.
    <div data-testid="upload-file-list">
      {files.map((f) => (
        // Arrange: Render mock file items with view and delete buttons to trigger props callbacks.
        <div key={f.id} data-testid={`file-item-${f.id}`} data-name={f.name}>
          <span>{f.name}</span>
          <button onClick={() => onViewFile(f)}>View {f.name}</button>
          <button onClick={() => onDeleteFile(f.id, f.key || null)}>Delete {f.name}</button>
          {onSetImageType && <button onClick={() => onSetImageType(f)}>Set Type {f.name}</button>}
        </div>
      ))}
      {/* Arrange: Add a button to test local deletion when no S3 key is present. */}
      <button onClick={() => onDeleteFile("phantom-id", null)}>Delete Phantom Local</button>
      {/* Arrange: Add a button to test server deletion when file is not in store. */}
      <button onClick={() => onDeleteFile("phantom-id", "phantom-key")}>
        Delete Phantom Server
      </button>
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
  const filesData: UploadableFile[] = [
    {
      ...mockUploads.firstUpload,
      id: "1",
      name: "instar-2.jpg",
      size: 5000,
      progress: 100,
      status: "success",
      source: "upload",
      dateUploaded: new Date("2025-01-01"),
      key: "key-1",
      version: 1,
      imageType: null,
    },
    {
      ...mockUploads.secondUpload,
      id: "2",
      name: "instar-3.jpg",
      size: 1000,
      progress: 100,
      status: "success",
      source: "upload",
      dateUploaded: new Date("2025-01-02"),
      version: 1,
      imageType: null,
      key: "",
    },
    {
      ...mockUploads.firstUpload,
      id: "3",
      name: "instar-1.jpg",
      size: 3000,
      progress: 100,
      status: "success",
      source: "upload",
      dateUploaded: new Date("2025-01-03"),
      key: "key-3",
      url: "https://example.com/instar-1.jpg",
      version: 1,
      imageType: null,
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

    /**
     * Test case to verify that a fallback error message is shown when the server rejection contains no details.
     */
    it("displays default error toast if server delete fails with no message", async () => {
      // Arrange: Mock the deletion service to reject with a generic error.
      (deleteUpload as unknown as Mock).mockRejectedValue(new Error());
      render(<UploadPreview />);

      // Act: Trigger the deletion of a specific file.
      fireEvent.click(screen.getByText("Delete instar-1.jpg"));

      // Assert: Verify that the toast notification displays the default error string.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("An error occurred during deletion.");
      });
    });

    /**
     * Test case to verify that a failure response without an error string triggers a default error message.
     */
    it("displays default error toast if deleteUpload returns success: false with no error text", async () => {
      // Arrange: Mock the deletion service to return a failed status without a specific message.
      (deleteUpload as unknown as Mock).mockResolvedValue({ success: false });
      render(<UploadPreview />);

      // Act: Trigger the deletion of a specific file.
      fireEvent.click(screen.getByText("Delete instar-1.jpg"));

      // Assert: Verify that the fallback server failure message is displayed in a toast.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to delete file from server.");
      });
    });

    /**
     * Test case to verify that a generic success message is shown even if the deleted file data is missing from the state.
     */
    it("displays generic success toast if deleted file is missing", async () => {
      // Arrange: Mock the deletion service to return a successful response.
      (deleteUpload as unknown as Mock).mockResolvedValue({ success: true });
      render(<UploadPreview />);

      // Act: Trigger the deletion of a file entry.
      fireEvent.click(screen.getByText("Delete Phantom Server"));

      // Assert: Verify that the success toast is triggered regardless of state presence.
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("File deleted successfully.");
      });
    });
  });

  /**
   * Test suite for managing image type categories (e.g., Macro, Field) within the preview.
   */
  describe("Image Type Selection", () => {
    /**
     * Test case to verify that local state is updated and a modal is used for files that haven't reached the server yet.
     */
    it("opens the image type modal and handles a pending file selection", () => {
      // Arrange: Set up a file in the store with a `pending` status.
      const mockSetImageType = vi.fn();
      const nonUploadedFiles = [
        {
          ...filesData[0],
          status: "pending",
        },
      ];
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        data: { files: nonUploadedFiles },
        setImageType: mockSetImageType,
      });

      render(<UploadPreview />);

      // Act: Open the selection modal and simulate a confirmation for the `macro` type.
      fireEvent.click(screen.getByText("Set Type instar-2.jpg"));
      expect(screen.getByTestId("image-type-modal")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Confirm Macro"));

      // Assert: Ensure the local store is updated and a notification confirms the future save.
      expect(mockSetImageType).toHaveBeenCalledWith("1", "macro");
      expect(toast.success).toHaveBeenCalledWith("The image type will be saved as macro.");
    });

    /**
     * Test case to verify that updating an already uploaded file triggers a server-side mutation.
     */
    it("handles an uploaded file selection and calls the server mutation", async () => {
      // Arrange: Set up a file in the store with a `success` status and mock the update service.
      const mockSetImageType = vi.fn();
      const uploadedFiles = [
        {
          ...filesData[0],
          status: "success",
        },
      ];
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        data: { files: uploadedFiles },
        setImageType: mockSetImageType,
      });
      (updateUpload as unknown as Mock).mockResolvedValue({ success: true });

      render(<UploadPreview />);

      // Act: Open the modal and confirm a change to the `field` type.
      fireEvent.click(screen.getByText("Set Type instar-2.jpg"));
      fireEvent.click(screen.getByText("Confirm Field"));

      // Assert: Verify the server mutation, local state update, and success toast are all executed.
      await waitFor(() => {
        expect(updateUpload).toHaveBeenCalledWith({ id: "1", imageType: "field" });
        expect(mockSetImageType).toHaveBeenCalledWith("1", "field");
        expect(toast.success).toHaveBeenCalledWith("The image type has been set to field.");
      });
    });

    /**
     * Test case to verify that specific server error messages are displayed to the user upon update failure.
     */
    it("displays error toast if updateUpload returns success: false", async () => {
      // Arrange: Set up the store with an uploaded file and mock a server-side failure message.
      const mockSetImageType = vi.fn();
      const uploadedFiles = [
        {
          ...filesData[0],
          status: "success",
        },
      ];
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        data: { files: uploadedFiles },
        setImageType: mockSetImageType,
      });
      (updateUpload as unknown as Mock).mockResolvedValue({
        success: false,
        error: "Update failed",
      });

      render(<UploadPreview />);

      // Act: Attempt to update the image type via the modal.
      fireEvent.click(screen.getByText("Set Type instar-2.jpg"));
      fireEvent.click(screen.getByText("Confirm Field"));

      // Assert: Verify that the specific error message from the server is displayed in a toast.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Update failed");
      });
    });

    /**
     * Test case to verify that network or unexpected server errors display the error's message property.
     */
    it("displays error toast if server update fails completely", async () => {
      // Arrange: Set up the store and mock a rejected promise with a specific error message.
      const mockSetImageType = vi.fn();
      const uploadedFiles = [
        {
          ...filesData[0],
          status: "success",
        },
      ];
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        data: { files: uploadedFiles },
        setImageType: mockSetImageType,
      });
      (updateUpload as unknown as Mock).mockRejectedValue(new Error("Network Error"));

      render(<UploadPreview />);

      // Act: Attempt to update the image type.
      fireEvent.click(screen.getByText("Set Type instar-2.jpg"));
      fireEvent.click(screen.getByText("Confirm Field"));

      // Assert: Verify the rejection message is displayed in the UI.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Network Error");
      });
    });

    /**
     * Test case to verify the fallback error message for failed updates with no descriptive error text.
     */
    it("displays error toast if updateUpload returns success: false empty message", async () => {
      // Arrange: Mock the update service to fail without providing a reason.
      const uploadedFiles = [{ ...filesData[0], status: "success" }];
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        data: { files: uploadedFiles },
      });
      (updateUpload as unknown as Mock).mockResolvedValue({ success: false });

      render(<UploadPreview />);

      // Act: Attempt to update the image type.
      fireEvent.click(screen.getByText("Set Type instar-2.jpg"));
      fireEvent.click(screen.getByText("Confirm Field"));

      // Assert: Ensure the default update failure string is shown.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to update image type.");
      });
    });

    /**
     * Test case to verify the fallback error message for rejected update promises with no message.
     */
    it("displays error toast if server update fails completely empty message", async () => {
      // Arrange: Mock a hard server rejection with no error payload.
      const uploadedFiles = [{ ...filesData[0], status: "success" }];
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        data: { files: uploadedFiles },
      });
      (updateUpload as unknown as Mock).mockRejectedValue(new Error());

      render(<UploadPreview />);

      // Act: Attempt to update the image type.
      fireEvent.click(screen.getByText("Set Type instar-2.jpg"));
      fireEvent.click(screen.getByText("Confirm Field"));

      // Assert: Ensure the default server exception string is shown.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("An error occurred while saving image type.");
      });
    });

    /**
     * Test case to verify that confirmations are ignored if the target file has been removed from the store since the modal opened.
     */
    it("ignores confirmation if the file cannot be found in the store", () => {
      // Arrange: Configure the store with standard data.
      const mockSetImageType = vi.fn();
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        data: { files: filesData },
        setImageType: mockSetImageType,
      });

      render(<UploadPreview />);

      // Act: Open the modal for a file, but simulate a confirmation for an ID not present in state.
      fireEvent.click(screen.getByText("Set Type instar-2.jpg"));
      expect(screen.getByTestId("image-type-modal")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Confirm Unknown"));

      // Assert: Verify that the store update was not called.
      expect(mockSetImageType).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that the modal correctly responds to open and close trigger interactions.
     */
    it("closes the image type modal", () => {
      // Arrange: Render the component.
      render(<UploadPreview />);

      // Act: Open the modal, verify its presence, and then trigger the close action.
      fireEvent.click(screen.getByText("Set Type instar-2.jpg"));
      expect(screen.getByTestId("image-type-modal")).toBeInTheDocument();

      // Act: Ensure dummy interactions do not close the modal.
      fireEvent.click(screen.getByText("Keep Open"));
      expect(screen.getByTestId("image-type-modal")).toBeInTheDocument();

      // Act: Trigger the formal close event.
      fireEvent.click(screen.getByText("Close Image Type"));

      // Assert: Verify the modal is removed from the DOM.
      expect(screen.queryByTestId("image-type-modal")).not.toBeInTheDocument();
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

      // Act: Attempt to navigate to the "Previous" file.
      fireEvent.click(screen.getByText("Previous"));

      // Assert: Verify that the viewing file is still unchanged.
      expect(screen.getByTestId("preview-file-name")).toHaveTextContent("instar-3.jpg");
    });

    /**
     * Test case to verify that the mutation error handler correctly extracts and displays the error message.
     */
    it("handles imageTypeMutation onError", async () => {
      // Arrange: Set up a store containing a successfully uploaded file.
      const uploadedFiles = [
        {
          id: "1",
          name: "instar-2.jpg",
          size: 5000,
          dateUploaded: new Date("2025-01-01"),
          key: "key-1",
          status: "success",
        },
      ];
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        data: { files: uploadedFiles },
      });

      // Arrange: Mock the mutation to reject with a specific error object.
      (updateUpload as unknown as Mock).mockRejectedValueOnce({
        message: "Generic Mutation Error",
      });

      render(<UploadPreview />);

      // Act: Attempt to confirm a new image type through the modal.
      fireEvent.click(screen.getByText("Set Type instar-2.jpg"));
      fireEvent.click(screen.getByText("Confirm Field"));

      // Assert: Verify that the toast notification displays the caught error message.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Generic Mutation Error");
      });
    });

    /**
     * Test case to verify that the mutation is aborted if the target file is no longer present in the store.
     */
    it("handles imageTypeMutation if !file return", () => {
      // Arrange: Initialize the component with an empty file list.
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        data: { files: [] },
      });
      render(<UploadPreview />);

      (useAnalyzeStore as unknown as Mock).mockReturnValue(defaultStoreState);
      render(<UploadPreview />);

      // Act: Attempt to interact with a file that does not exist or cannot be identified.
      fireEvent.click(screen.getByText("Set Type instar-2.jpg"));
      fireEvent.click(screen.getByText("Confirm Unknown"));

      // Assert: Ensure that the server mutation logic was never triggered.
      expect(updateUpload).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that a successful network response containing a logical application error is handled.
     */
    it("handles mutation success with custom error message", async () => {
      // Arrange: Set up a store with a valid file.
      const uploadedFiles = [
        {
          id: "1",
          name: "instar-2.jpg",
          size: 5000,
          dateUploaded: new Date("2025-01-01"),
          key: "key-1",
          status: "success",
        },
      ];
      (useAnalyzeStore as unknown as Mock).mockReturnValue({
        ...defaultStoreState,
        data: { files: uploadedFiles },
      });

      // Arrange: Mock the server response to indicate failure via a returned error property.
      (updateUpload as unknown as Mock).mockResolvedValue({
        success: false,
        error: "Server Error Message",
      });

      render(<UploadPreview />);

      // Act: Attempt to update the image type via the UI.
      fireEvent.click(screen.getByText("Set Type instar-2.jpg"));
      fireEvent.click(screen.getByText("Confirm Field"));

      // Assert: Verify that the application displays the specific error message provided by the server.
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Server Error Message");
      });
    });
  });
});
