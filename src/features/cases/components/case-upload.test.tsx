import { fileTypeFromBlob } from "file-type";
import React from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, userEvent } from "@/__tests__/setup/test-utils";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { CaseUpload } from "@/features/cases/components/case-upload";

// Define the type for the mock drop handler from react-dropzone.
type MockDropHandler = (acceptedFiles: File[], fileRejections: unknown[]) => Promise<void>;

// Mock external library for file type validation using magic numbers.
vi.mock("file-type", () => ({
  fileTypeFromBlob: vi.fn(),
}));

// Mock the `sonner` toast library to spy on error messages.
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock the state management store dependency.
vi.mock("@/features/analyze/store/analyze-store");

// Mock the file processor hook, as its logic is tested separately.
vi.mock("@/features/upload/hooks/use-file-processor", () => ({
  useFileProcessor: vi.fn(),
}));

// Variable to capture the `onDrop` function passed to `useDropzone` for manual triggering.
let capturedOnDrop: MockDropHandler | undefined;

// Mock the `react-dropzone` hook to capture the `onDrop` handler.
vi.mock("react-dropzone", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dropzone")>();
  return {
    ...actual,
    useDropzone: (options: { onDrop: MockDropHandler }) => {
      capturedOnDrop = options.onDrop;
      return {
        getRootProps: vi.fn().mockReturnValue({}),
        getInputProps: vi.fn().mockReturnValue({}),
        isDragActive: false,
        open: vi.fn(),
      };
    },
  };
});

// Mock child components to isolate the logic of `CaseUpload`.
vi.mock("@/features/upload/components/upload-form-header", () => ({
  UploadFormHeader: () => <div data-testid="upload-header" />,
}));

// Mock the tab navigation for method selection (Upload/Camera).
vi.mock("@/features/upload/components/upload-method-tabs", () => ({
  UploadMethodTabs: ({
    activeTab,
    onTabChange,
  }: {
    activeTab: string;
    onTabChange: (val: string) => void;
  }) => (
    <div data-testid="upload-tabs">
      <button onClick={() => onTabChange("camera")}>Switch to Camera</button>
      <span>Active: {activeTab}</span>
    </div>
  ),
}));

// Mock the dropzone area with buttons to trigger modal opening.
vi.mock("@/features/upload/components/upload-dropzone", () => ({
  UploadDropzone: ({
    onOpenFormatsModal,
    onOpenCamera,
  }: {
    onOpenFormatsModal: () => void;
    onOpenCamera: () => void;
  }) => (
    <div data-testid="upload-dropzone">
      <button onClick={onOpenFormatsModal}>Open Formats</button>
      <button onClick={onOpenCamera}>Open Camera</button>
    </div>
  ),
}));

// Mock the preview component where uploaded files are listed.
vi.mock("@/features/upload/components/upload-preview", () => ({
  UploadPreview: () => <div data-testid="upload-preview" />,
}));

// Mock the form actions (Prev/Next buttons) to test step navigation logic.
vi.mock("@/features/upload/components/upload-form-actions", () => ({
  UploadFormActions: ({
    onPrev,
    onNext,
    isNextDisabled,
  }: {
    onPrev: () => void;
    onNext: () => void;
    isNextDisabled: boolean;
  }) => (
    <div data-testid="upload-actions">
      <button onClick={onPrev}>Prev</button>
      <button onClick={onNext} disabled={isNextDisabled}>
        Next
      </button>
    </div>
  ),
}));

// Mock `next/dynamic` to simulate dynamically loaded components (modals) and control their rendering state.
vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    if (typeof loader === "function") {
      loader();
    }
    return function MockDynamicComponent(props: { isOpen?: boolean }) {
      if (typeof props.isOpen === "boolean") {
        return props.isOpen ? <div data-testid="mock-dynamic-modal">Modal Open</div> : null;
      }
      return <div data-testid="upload-preview">Preview Content</div>;
    };
  },
}));

// Define a mock file object for testing drop and validation logic.
const mockFile = new File(["dummy content"], "test.jpg", { type: "image/jpeg" });
// Define default mock values for the analysis store.
const mockStoreValues = {
  nextStep: vi.fn(),
  prevStep: vi.fn(),
  caseId: "case-123",
  data: { files: [] },
  addFiles: vi.fn(),
};

/**
 * Test suite for the `CaseUpload` component.
 */
describe("CaseUpload Component", () => {
  beforeEach(() => {
    // Reset all mock function calls and captured drop handlers before each test.
    vi.clearAllMocks();
    capturedOnDrop = undefined;

    // Arrange: Mock the store return value.
    vi.mocked(useAnalyzeStore).mockReturnValue(
      mockStoreValues as unknown as ReturnType<typeof useAnalyzeStore>
    );

    // Arrange: Default mock for `fileTypeFromBlob` to indicate a valid image type.
    vi.mocked(fileTypeFromBlob).mockResolvedValue({ ext: "jpg", mime: "image/jpeg" });
  });

  /**
   * Test case to verify that all structural components of the upload page are rendered.
   */
  it("renders the main layout components", () => {
    // Arrange: Render the component.
    render(<CaseUpload />);

    // Assert: Check for the presence of the header, tabs, dropzone, preview, and action buttons.
    expect(screen.getByTestId("upload-header")).toBeInTheDocument();
    expect(screen.getByTestId("upload-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("upload-dropzone")).toBeInTheDocument();

    expect(screen.getByTestId("upload-preview")).toBeInTheDocument();

    expect(screen.getByTestId("upload-actions")).toBeInTheDocument();
  });

  /**
   * Test suite for logic executed when files are dropped into the dropzone.
   */
  describe("File Drop Logic", () => {
    /**
     * Test case to verify that valid files are passed to the store's `addFiles` action.
     */
    it("adds valid files when dropped", async () => {
      // Arrange: Render the component.
      render(<CaseUpload />);

      // Act: Manually call the captured `onDrop` handler with the mock file.
      if (capturedOnDrop) {
        await capturedOnDrop([mockFile], []);
      }

      // Assert: Check that file type validation was performed.
      expect(fileTypeFromBlob).toHaveBeenCalledWith(mockFile);
      // Assert: Check that the store's `addFiles` was called with the file and source type.
      expect(mockStoreValues.addFiles).toHaveBeenCalledWith([mockFile], "upload");
      // Assert: Check that no error toast was displayed.
      expect(toast.error).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify file rejection when the file type validation fails (e.g., non-image magic number).
     */
    it("rejects files with invalid magic numbers (mime check)", async () => {
      // Arrange: Mock `fileTypeFromBlob` to return an invalid file type.
      vi.mocked(fileTypeFromBlob).mockResolvedValue({
        ext: "exe",
        mime: "application/x-msdownload",
      });

      // Arrange: Render the component.
      render(<CaseUpload />);

      // Act: Manually call the captured `onDrop` handler.
      if (capturedOnDrop) {
        await capturedOnDrop([mockFile], []);
      }

      // Assert: Check that the file was NOT added to the store.
      expect(mockStoreValues.addFiles).not.toHaveBeenCalled();
      // Assert: Check that an error toast specific to the corrupted file was displayed.
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("test.jpg appears to be corrupted")
      );
    });

    /**
     * Test case to verify file rejection when the file name already exists in the upload list (duplicate check).
     */
    it("rejects duplicate files", async () => {
      // Arrange: Mock the store state to contain a file with the same name.
      vi.mocked(useAnalyzeStore).mockReturnValue({
        ...mockStoreValues,
        data: { files: [{ name: "test.jpg", status: "success" }] },
      } as unknown as ReturnType<typeof useAnalyzeStore>);

      // Arrange: Render the component.
      render(<CaseUpload />);

      // Act: Manually call the captured `onDrop` handler.
      if (capturedOnDrop) {
        await capturedOnDrop([mockFile], []);
      }

      // Assert: Check that the file was NOT added to the store.
      expect(mockStoreValues.addFiles).not.toHaveBeenCalled();
      // Assert: Check that a toast error message regarding duplicates was displayed.
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("already in the upload list")
      );
    });

    /**
     * Test case to verify handling of rejections reported directly by `react-dropzone` (e.g., due to file size limits).
     */
    it("handles react-dropzone rejections (e.g. size limit)", async () => {
      // Arrange: Render the component.
      render(<CaseUpload />);

      // Arrange: Define a mock rejection object for a file that is too large.
      const rejection = {
        file: { name: "big.jpg" },
        errors: [{ code: "file-too-large", message: "File is too large" }],
      };

      // Act: Manually call the captured `onDrop` handler with the rejection array populated.
      if (capturedOnDrop) {
        await capturedOnDrop([], [rejection]);
      }

      // Assert: Check that an error toast explaining the size limit was displayed.
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("big.jpg is larger than"));
      // Assert: Check that no files were added to the store.
      expect(mockStoreValues.addFiles).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify handling of rejections due to unsupported file type detected by `react-dropzone`.
     */
    it("handles react-dropzone rejections for invalid file type", async () => {
      // Arrange: Render the component.
      render(<CaseUpload />);

      // Arrange: Define a mock rejection object for an invalid file type.
      const rejection = {
        file: { name: "test.txt" },
        errors: [{ code: "file-invalid-type", message: "Invalid type" }],
      };

      // Act: Manually call the captured `onDrop` handler.
      if (capturedOnDrop) {
        await capturedOnDrop([], [rejection]);
      }

      // Assert: Check that an error toast specific to the unsupported file type was displayed.
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("test.txt is not a supported file type")
      );
    });

    /**
     * Test case to verify handling of rejections when the number of dropped files exceeds the maximum allowed.
     */
    it("handles react-dropzone rejections for too many files", async () => {
      // Arrange: Render the component.
      render(<CaseUpload />);

      // Arrange: Define a mock rejection object for exceeding the file count limit.
      const rejection = {
        file: { name: "extra.jpg" },
        errors: [{ code: "too-many-files", message: "Too many files" }],
      };

      // Act: Manually call the captured `onDrop` handler.
      if (capturedOnDrop) {
        await capturedOnDrop([], [rejection]);
      }

      // Assert: Check that an error toast indicating the maximum file limit was displayed.
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("You can only upload a maximum of")
      );
    });

    /**
     * Test case to verify application logic that prevents adding files if the total count in the store would exceed the absolute limit.
     */
    it("prevents adding files if total exceeds MAX_FILES limit", async () => {
      // Arrange: Define a large array of existing files to simulate reaching the limit.
      const manyFiles = Array(20)
        .fill(null)
        .map((_, i) => ({ name: `file-${i}.jpg` }));
      vi.mocked(useAnalyzeStore).mockReturnValue({
        ...mockStoreValues,
        data: { files: manyFiles },
      } as unknown as ReturnType<typeof useAnalyzeStore>);

      // Arrange: Render the component.
      render(<CaseUpload />);

      // Act: Manually call the captured `onDrop` handler with one new file.
      if (capturedOnDrop) {
        await capturedOnDrop([mockFile], []);
      }

      // Assert: Check that the `addFiles` action was NOT called.
      expect(mockStoreValues.addFiles).not.toHaveBeenCalled();
      // Assert: Check that an error toast regarding exceeding the limit was displayed.
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Cannot add"));
    });
  });

  /**
   * Test suite for user interactions with buttons and the control flow.
   */
  describe("Interface Interactions", () => {
    /**
     * Test case to verify that the supported file formats modal is correctly opened.
     */
    it("opens the supported formats modal", async () => {
      // Arrange: Set up user events and render the component.
      const user = userEvent.setup();
      render(<CaseUpload />);

      // Act: Click the mock button that triggers the modal open state.
      await user.click(screen.getByText("Open Formats"));

      // Assert: Check for the presence of the mock dynamic modal component.
      expect(screen.getByTestId("mock-dynamic-modal")).toBeInTheDocument();
    });

    /**
     * Test case to verify that the camera capture modal is correctly opened.
     */
    it("opens the camera modal", async () => {
      // Arrange: Set up user events and render the component.
      const user = userEvent.setup();
      render(<CaseUpload />);

      // Act: Click the mock button that triggers the camera modal open state.
      await user.click(screen.getByText("Open Camera"));

      // Assert: Check for the presence of the mock dynamic modal component.
      expect(screen.getByTestId("mock-dynamic-modal")).toBeInTheDocument();
    });

    /**
     * Test case to verify that the "Next" button is disabled if the upload list is empty.
     */
    it("disables 'Next' button if no files exist", () => {
      // Arrange: Mock the store to contain an empty file list.
      vi.mocked(useAnalyzeStore).mockReturnValue({
        ...mockStoreValues,
        data: { files: [] },
      } as unknown as ReturnType<typeof useAnalyzeStore>);

      // Arrange: Render the component.
      render(<CaseUpload />);

      // Assert: Check that the "Next" button is disabled.
      expect(screen.getByText("Next")).toBeDisabled();
    });

    /**
     * Test case to verify that the "Next" button is disabled if at least one file is not yet successfully uploaded.
     */
    it("disables 'Next' button if file uploads are pending", () => {
      // Arrange: Mock the store to contain a file with a "pending" status.
      vi.mocked(useAnalyzeStore).mockReturnValue({
        ...mockStoreValues,
        data: { files: [{ status: "pending" }] },
      } as unknown as ReturnType<typeof useAnalyzeStore>);

      // Arrange: Render the component.
      render(<CaseUpload />);

      // Assert: Check that the "Next" button is disabled.
      expect(screen.getByText("Next")).toBeDisabled();
    });

    /**
     * Test case to verify that the "Next" button is enabled only when all existing files have a "success" status.
     */
    it("enables 'Next' button if files are successful", () => {
      // Arrange: Mock the store to contain a file with a "success" status.
      vi.mocked(useAnalyzeStore).mockReturnValue({
        ...mockStoreValues,
        data: { files: [{ status: "success" }] },
      } as unknown as ReturnType<typeof useAnalyzeStore>);

      // Arrange: Render the component.
      render(<CaseUpload />);

      // Assert: Check that the "Next" button is NOT disabled.
      expect(screen.getByText("Next")).not.toBeDisabled();
    });

    /**
     * Test case to verify that clicking the "Prev" button triggers the store's `prevStep` action for navigation.
     */
    it("calls prevStep when 'Prev' is clicked", async () => {
      // Arrange: Set up user events and render the component.
      const user = userEvent.setup();
      render(<CaseUpload />);

      // Act: Click the "Prev" button.
      await user.click(screen.getByText("Prev"));
      // Assert: Check that the mock `prevStep` function was called.
      expect(mockStoreValues.prevStep).toHaveBeenCalled();
    });
  });
});
