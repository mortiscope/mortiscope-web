import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@/__tests__/setup/test-utils";
import { ResultsImages } from "@/features/images/components/results-images";
import { useResultsImages } from "@/features/images/hooks/use-results-images";

// Mock child components to isolate the testing of the ResultsImages container logic.
vi.mock("@/features/images/components/results-images-modal", () => ({
  ResultsImagesModal: () => <div data-testid="preview-modal" />,
}));
vi.mock("@/features/export/components/export-image-modal", () => ({
  ExportImageModal: () => <div data-testid="export-modal" />,
}));
vi.mock("@/features/images/components/delete-image-modal", () => ({
  DeleteImageModal: () => <div data-testid="delete-modal" />,
}));
vi.mock("@/features/annotation/components/edit-image-modal", () => ({
  EditImageModal: () => <div data-testid="edit-modal" />,
}));

// Mock next/dynamic to simulate the conditional loading of heavy modal components.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>, options?: { loading?: () => React.ReactNode }) => {
    loader();
    if (options?.loading) {
      options.loading();
    }
    // Return a dummy component that renders specific test IDs based on which props are passed, allowing verification of which dynamic component was loaded.
    return function DynamicComponent(props: Record<string, unknown>) {
      if (props.image && props.onNext) return <div data-testid="preview-modal" />;
      if (props.image && props.onOpenChange && !props.resultsId)
        return <div data-testid="export-modal" />;
      if (props.imageId !== undefined && props.totalImages !== undefined)
        return <div data-testid="delete-modal" />;
      if (props.resultsId) return <div data-testid="edit-modal" />;

      return null;
    };
  },
}));

// Mock the custom hook to control the state and actions provided to the component.
vi.mock("@/features/images/hooks/use-results-images");

interface MockImageGridProps {
  onView: (id: string) => void;
  onEdit: (img: unknown) => void;
  onExport: (img: unknown) => void;
  onDelete: (img: unknown) => void;
  images: { id: string; name: string }[];
}

interface MockToolbarProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

// Mock the `ImageGrid` to expose action buttons for testing event propagation.
vi.mock("@/features/images/components/image-grid", () => ({
  ImageGrid: ({ onView, onEdit, onExport, onDelete, images }: MockImageGridProps) => (
    <div data-testid="image-grid">
      {images.map((img) => (
        <button key={img.id} onClick={() => onView(img.id)} data-testid={`view-${img.id}`}>
          View {img.name}
        </button>
      ))}
      <button onClick={() => onEdit(images[0])} data-testid="edit-btn">
        Edit
      </button>
      <button onClick={() => onExport(images[0])} data-testid="export-btn">
        Export
      </button>
      <button onClick={() => onDelete(images[0])} data-testid="delete-btn">
        Delete
      </button>
    </div>
  ),
}));

// Mock the toolbar to verify search term state binding.
vi.mock("@/features/images/components/image-toolbar", () => ({
  ImageToolbar: ({ searchTerm, onSearchTermChange }: MockToolbarProps) => (
    <div data-testid="image-toolbar">
      <input
        data-testid="search-input"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
      />
    </div>
  ),
}));

vi.mock("@/features/results/components/results-no-search-results", () => ({
  ResultsNoSearchResults: () => <div data-testid="no-results">No Results</div>,
}));

vi.mock("@/features/results/components/results-skeleton", () => ({
  ResultsImagesSkeleton: () => <div data-testid="skeleton-loader">Loading...</div>,
}));

// Mock framer-motion to bypass animation logic.
vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockFile = { id: "1", name: "test.jpg" };

// Define default return values for the mocked hook to ensure consistent test starting states.
const defaultHookValues = {
  searchTerm: "",
  setSearchTerm: vi.fn(),
  sortOption: "date-desc",
  setSortOption: vi.fn(),
  isSortDisabled: false,
  sortedFiles: [mockFile],
  previewModal: {
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    selectedItem: null,
    next: vi.fn(),
    previous: vi.fn(),
    selectById: vi.fn(),
  },
  isExportModalOpen: false,
  setIsExportModalOpen: vi.fn(),
  imageToExport: null,
  handleOpenExportModal: vi.fn(),
  isEditModalOpen: false,
  setIsEditModalOpen: vi.fn(),
  imageToEdit: null,
  handleOpenEditModal: vi.fn(),
  isDeleteModalOpen: false,
  setIsDeleteModalOpen: vi.fn(),
  imageToDelete: null,
  handleOpenDeleteModal: vi.fn(),
  totalImages: 1,
};

/**
 * Test suite for the `ResultsImages` container component covering loading states, grid rendering, and modal interactions.
 */
describe("ResultsImages", () => {
  // Reset mocks and apply default hook values before every test to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useResultsImages).mockReturnValue(
      defaultHookValues as unknown as ReturnType<typeof useResultsImages>
    );
  });

  /**
   * Test case to verify that the skeleton loader is displayed when data is loading.
   */
  it("renders loading skeleton when isLoading is true", () => {
    // Arrange: Render the component with isLoading set to true.
    render(<ResultsImages isLoading={true} />);
    // Assert: Verify the skeleton is present and the grid is absent.
    expect(screen.getByTestId("skeleton-loader")).toBeInTheDocument();
    expect(screen.queryByTestId("image-grid")).toBeNull();
  });

  /**
   * Test case to verify that the image grid renders when loading is complete.
   */
  it("renders image grid when not loading", () => {
    // Arrange: Render the component with isLoading set to false.
    render(<ResultsImages isLoading={false} />);
    // Assert: Verify the grid is present and the skeleton is absent.
    expect(screen.getByTestId("image-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("skeleton-loader")).toBeNull();
  });

  /**
   * Test case to verify that the toolbar is always rendered after mounting.
   */
  it("renders toolbar after mounting", () => {
    // Arrange: Render the component.
    render(<ResultsImages isLoading={false} />);
    // Assert: Check for the toolbar component.
    expect(screen.getByTestId("image-toolbar")).toBeInTheDocument();
  });

  /**
   * Test case to verify that the "No Results" state displays when a search term matches nothing.
   */
  it("renders 'No Results' when sortedFiles is empty and search term exists", () => {
    // Arrange: Mock the hook to return an empty file list but a populated search term.
    vi.mocked(useResultsImages).mockReturnValue({
      ...defaultHookValues,
      sortedFiles: [],
      searchTerm: "query",
    } as unknown as ReturnType<typeof useResultsImages>);

    render(<ResultsImages isLoading={false} />);
    // Assert: Check for the no-results component and ensure the grid is hidden.
    expect(screen.getByTestId("no-results")).toBeInTheDocument();
    expect(screen.queryByTestId("image-grid")).toBeNull();
  });

  /**
   * Test case to verify that nothing renders in the content area when the list is empty and no search is active (e.g., deleted all images).
   */
  it("renders nothing when sortedFiles is empty and NO search term (initial empty state)", () => {
    // Arrange: Mock the hook to return an empty file list and empty search term.
    vi.mocked(useResultsImages).mockReturnValue({
      ...defaultHookValues,
      sortedFiles: [],
      searchTerm: "",
    } as unknown as ReturnType<typeof useResultsImages>);

    render(<ResultsImages isLoading={false} />);
    // Assert: Ensure neither the "no results" message nor the grid is displayed.
    expect(screen.queryByTestId("no-results")).toBeNull();
    expect(screen.queryByTestId("image-grid")).toBeNull();
  });

  /**
   * Test case to verify that the preview modal opens with the correct image when requested.
   */
  it("opens preview modal with correct image when View is clicked", () => {
    // Arrange: Spy on the modal open function from the hook.
    const openMock = vi.fn();
    vi.mocked(useResultsImages).mockReturnValue({
      ...defaultHookValues,
      previewModal: { ...defaultHookValues.previewModal, open: openMock },
    } as unknown as ReturnType<typeof useResultsImages>);

    render(<ResultsImages isLoading={false} />);

    // Act: Click the view button on a mock image card.
    fireEvent.click(screen.getByTestId("view-1"));
    // Assert: Verify the open function was called with the correct file object.
    expect(openMock).toHaveBeenCalledWith(mockFile);
  });

  /**
   * Test case to verify that edit, export, and delete actions trigger their respective handlers.
   */
  it("calls appropriate handlers for edit, export, delete actions", () => {
    // Arrange: Create spies for the action handlers.
    const handleEdit = vi.fn();
    const handleExport = vi.fn();
    const handleDelete = vi.fn();

    vi.mocked(useResultsImages).mockReturnValue({
      ...defaultHookValues,
      handleOpenEditModal: handleEdit,
      handleOpenExportModal: handleExport,
      handleOpenDeleteModal: handleDelete,
    } as unknown as ReturnType<typeof useResultsImages>);

    render(<ResultsImages isLoading={false} />);

    // Act: Click the Edit button.
    fireEvent.click(screen.getByTestId("edit-btn"));
    // Assert: Verify edit handler was called.
    expect(handleEdit).toHaveBeenCalled();

    // Act: Click the Export button.
    fireEvent.click(screen.getByTestId("export-btn"));
    // Assert: Verify export handler was called.
    expect(handleExport).toHaveBeenCalled();

    // Act: Click the Delete button.
    fireEvent.click(screen.getByTestId("delete-btn"));
    // Assert: Verify delete handler was called.
    expect(handleDelete).toHaveBeenCalled();
  });

  /**
   * Test case to verify that modals render when their corresponding state flags are set to true.
   */
  it("conditionally renders modals when their state is open", async () => {
    // Arrange: Mock the hook to set all modal open states to true and provide required data.
    vi.mocked(useResultsImages).mockReturnValue({
      ...defaultHookValues,
      previewModal: { ...defaultHookValues.previewModal, isOpen: true, selectedItem: mockFile },
      isExportModalOpen: true,
      imageToExport: mockFile,
      isEditModalOpen: true,
      imageToEdit: mockFile,
      isDeleteModalOpen: true,
      imageToDelete: mockFile,
    } as unknown as ReturnType<typeof useResultsImages>);

    render(<ResultsImages isLoading={false} resultsId="test-result-id" />);

    // Assert: Verify that all four modal types are present in the DOM.
    expect(screen.getByTestId("preview-modal")).toBeInTheDocument();
    expect(screen.getByTestId("export-modal")).toBeInTheDocument();
    expect(screen.getByTestId("delete-modal")).toBeInTheDocument();
    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
  });
});
