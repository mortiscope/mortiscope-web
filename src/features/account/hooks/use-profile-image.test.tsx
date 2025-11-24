import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fileTypeFromBlob } from "file-type";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { act, renderHook } from "@/__tests__/setup/test-utils";
import {
  generateProfileImageUploadUrl,
  updateProfileImageUrl,
} from "@/features/account/actions/update-profile-image";
import { useProfileImage } from "@/features/account/hooks/use-profile-image";
import { MAX_FILE_SIZE } from "@/lib/constants";

// Mock the file-type library to simulate magic byte validation of uploaded blobs.
vi.mock("file-type", () => ({
  fileTypeFromBlob: vi.fn(),
}));

// Mock the toast notification system to verify error and success messaging.
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the server actions responsible for S3 URL generation and database updates.
vi.mock("@/features/account/actions/update-profile-image", () => ({
  generateProfileImageUploadUrl: vi.fn(),
  updateProfileImageUrl: vi.fn(),
}));

/**
 * Helper function to generate a mock File object with specific metadata for testing.
 */
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(["a".repeat(size)], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

/**
 * Higher-order function to provide a React Query context wrapper for rendering hooks.
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

/**
 * Test suite for the `useProfileImage` custom hook.
 */
describe("useProfileImage", () => {
  // Reset environment and global mocks before each test execution.
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    vi.mocked(fileTypeFromBlob).mockResolvedValue({ ext: "png", mime: "image/png" });
  });

  /**
   * Test case to verify the default return values of the hook upon initial mount.
   */
  it("initializes with default states", () => {
    // Arrange: Render the hook with the QueryClient wrapper.
    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });

    // Assert: Check that all loading states are false and refs are null.
    expect(result.current.isUploading).toBe(false);
    expect(result.current.optimisticImageUrl).toBeNull();
    expect(result.current.isPending).toBe(false);
    expect(result.current.fileInputRef.current).toBeNull();
  });

  /**
   * Test case to verify that the selection method programmatically triggers the file input element.
   */
  it("triggers file input click when selectFile is called", () => {
    // Arrange: Render hook and mock the HTML click method on the ref.
    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });

    const clickSpy = vi.fn();
    result.current.fileInputRef.current = {
      click: clickSpy,
      value: "",
    } as unknown as HTMLInputElement;

    // Act: Invoke the `selectFile` method.
    act(() => {
      result.current.selectFile();
    });

    // Assert: Verify that the native `click` method was called on the input ref.
    expect(clickSpy).toHaveBeenCalled();
  });

  /**
   * Test case to verify that files exceeding `MAX_FILE_SIZE` are rejected immediately.
   */
  it("validates file size", async () => {
    // Arrange: Create a file larger than the allowed limit.
    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });
    const largeFile = createMockFile("large.png", MAX_FILE_SIZE + 1, "image/png");

    const event = {
      target: { files: [largeFile], value: "path/to/file" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    // Act: Simulate the file change event.
    await act(async () => {
      await result.current.handleFileChange(event);
    });

    // Assert: Verify error toast was shown and upload process was halted.
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Image is too large"));
    expect(generateProfileImageUploadUrl).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that non-image MIME types provided by the input are rejected.
   */
  it("validates file mime type via input property", async () => {
    // Arrange: Create a PDF file.
    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });
    const invalidFile = createMockFile("doc.pdf", 1000, "application/pdf");

    const event = {
      target: { files: [invalidFile], value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    // Act: Simulate selecting the PDF.
    await act(async () => {
      await result.current.handleFileChange(event);
    });

    // Assert: Verify that the hook blocks files based on the `application/pdf` MIME type.
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Invalid file type"));
    expect(generateProfileImageUploadUrl).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify deep file validation using the `file-type` library for magic byte inspection.
   */
  it("validates file content via magic bytes (file-type)", async () => {
    // Arrange: Mock a file that claims to be a PNG but is actually an executable.
    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });
    const fakeImage = createMockFile("fake.png", 1000, "image/png");

    vi.mocked(fileTypeFromBlob).mockResolvedValue({ ext: "exe", mime: "application/x-msdownload" });

    const event = {
      target: { files: [fakeImage], value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    // Act: Simulate file selection and validation.
    await act(async () => {
      await result.current.handleFileChange(event);
    });

    // Assert: Verify rejection based on content analysis despite the file extension.
    expect(toast.error).toHaveBeenCalledWith("Invalid or corrupted image file.");
    expect(generateProfileImageUploadUrl).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify the complete successful flow of uploading to S3 and updating the profile.
   */
  it("handles full successful upload flow", async () => {
    // Arrange: Mock successful S3 URL generation, successful fetch, and successful DB update.
    const mockFile = createMockFile("avatar.png", 1024, "image/png");
    const mockPresignedUrl = "https://s3.amazonaws.com/bucket/key?token=123";

    vi.mocked(generateProfileImageUploadUrl).mockResolvedValue({
      success: true,
      data: { url: mockPresignedUrl, key: "key" },
    });

    vi.mocked(updateProfileImageUrl).mockResolvedValue({ success: true });

    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });

    const event = {
      target: { files: [mockFile], value: "C:\\fakepath\\avatar.png" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    const mockInput = { value: "C:\\fakepath\\avatar.png" } as unknown as HTMLInputElement;
    result.current.fileInputRef.current = mockInput;

    // Act: Trigger the upload sequence.
    await act(async () => {
      await result.current.handleFileChange(event);
    });

    // Assert: Verify S3 upload was initiated via `PUT` with the raw file.
    expect(generateProfileImageUploadUrl).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      mockPresignedUrl,
      expect.objectContaining({
        method: "PUT",
        body: mockFile,
      })
    );

    // Assert: Verify the S3 key is stored in the database (not the URL).
    expect(updateProfileImageUrl).toHaveBeenCalledWith("key");
    expect(result.current.optimisticImageUrl).toBeTruthy();
    expect(localStorage.getItem("optimistic-profile-image")).toBeTruthy();
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));

    // Assert: Verify form cleanup and success feedback.
    expect(mockInput.value).toBe("");
    expect(toast.success).toHaveBeenCalledWith("Profile image successfully updated.");
  });

  /**
   * Test case to verify failure handling when the server cannot generate an upload URL.
   */
  it("handles error during presigned URL generation", async () => {
    // Arrange: Mock a failed response from the server action.
    const mockFile = createMockFile("avatar.png", 1024, "image/png");

    vi.mocked(generateProfileImageUploadUrl).mockResolvedValue({
      success: false,
      error: "S3 Error",
    });

    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });

    // Act: Simulate selecting a file.
    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    // Assert: Verify the S3 upload attempt was aborted and user was notified.
    expect(toast.error).toHaveBeenCalledWith("S3 Error");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify handling of network errors or server failures during the S3 binary upload.
   */
  it("handles S3 upload failure", async () => {
    // Arrange: Mock successful URL generation but a failed fetch response.
    const mockFile = createMockFile("avatar.png", 1024, "image/png");

    vi.mocked(generateProfileImageUploadUrl).mockResolvedValue({
      success: true,
      data: { url: "http://upload", key: "k" },
    });

    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });

    // Act: Simulate selecting a file.
    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    // Assert: Verify database update was skipped and error toast was displayed.
    expect(toast.error).toHaveBeenCalledWith("Failed to upload image. Please try again.");
    expect(updateProfileImageUrl).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify handling of database record update failures after a successful file upload.
   */
  it("handles database update failure", async () => {
    // Arrange: Mock successful S3 upload but a failed database update action.
    const mockFile = createMockFile("avatar.png", 1024, "image/png");

    vi.mocked(generateProfileImageUploadUrl).mockResolvedValue({
      success: true,
      data: { url: "http://upload", key: "k" },
    });
    vi.mocked(updateProfileImageUrl).mockResolvedValue({
      success: false,
      error: "DB Error",
    });

    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });

    // Act: Simulate selecting a file.
    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    // Assert: Verify the specific database error message was displayed.
    expect(toast.error).toHaveBeenCalledWith("DB Error");
  });

  /**
   * Test case to verify handling of unexpected exceptions during magic byte validation.
   */
  it("handles failed image validation", async () => {
    // Arrange: Mock `file-type` to throw an error.
    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });
    const mockFile = createMockFile("test.png", 100, "image/png");

    vi.mocked(fileTypeFromBlob).mockRejectedValue(new Error("Validation failed"));

    const event = {
      target: { files: [mockFile], value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    // Act: Simulate file selection.
    await act(async () => {
      await result.current.handleFileChange(event);
    });

    // Assert: Verify that validation crashes are caught and reported.
    expect(toast.error).toHaveBeenCalledWith("Failed to validate image file.");
    expect(generateProfileImageUploadUrl).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify catch-all error handling for unhandled exceptions in the upload logic.
   */
  it("handles unhandled exceptions during upload", async () => {
    // Arrange: Force an unexpected error in the upload URL generation logic.
    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });
    const mockFile = createMockFile("test.png", 100, "image/png");

    vi.mocked(generateProfileImageUploadUrl).mockImplementation(() => {
      throw new Error("Unexpected crash");
    });

    const event = {
      target: { files: [mockFile], value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    // Act: Simulate file selection.
    await act(async () => {
      await result.current.handleFileChange(event);
    });

    // Assert: Verify the user receives a generic unexpected error message.
    expect(toast.error).toHaveBeenCalledWith("An unexpected error occurred.");
  });

  /**
   * Test case to verify that missing data in a "successful" server response is handled correctly.
   */
  it("handles successful URL generation with missing data", async () => {
    // Arrange: Mock a response that is marked successful but contains null data.
    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });
    const mockFile = createMockFile("avatar.png", 1024, "image/png");

    vi.mocked(generateProfileImageUploadUrl).mockResolvedValue({
      success: true,
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof generateProfileImageUploadUrl>>);

    const event = {
      target: { files: [mockFile], value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    // Act: Trigger file change.
    await act(async () => {
      await result.current.handleFileChange(event);
    });

    // Assert: Verify that the hook reports a failure to prepare the upload.
    expect(toast.error).toHaveBeenCalledWith("Failed to prepare upload.");
  });

  /**
   * Test case to verify that the hook stores the S3 key in the database after a successful upload.
   */
  it("stores the S3 key in the database after upload", async () => {
    // Arrange: Mock response with a specific key.
    const mockFile = createMockFile("avatar.png", 1024, "image/png");
    const mockUrl = "https://s3.original.url";
    const mockKey = "profile-images/user123/abc123.png";

    vi.mocked(generateProfileImageUploadUrl).mockResolvedValue({
      success: true,
      data: { url: mockUrl, key: mockKey },
    });
    vi.mocked(updateProfileImageUrl).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });

    // Act: Trigger upload.
    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    // Assert: Verify database update used the S3 key.
    expect(updateProfileImageUrl).toHaveBeenCalledWith(mockKey);
  });

  /**
   * Test case to verify default messaging when the database update fails without a provided error string.
   */
  it("shows default error message on DB update failure without message", async () => {
    // Arrange: Mock a database failure with a null error property.
    const mockFile = createMockFile("avatar.png", 1024, "image/png");

    vi.mocked(generateProfileImageUploadUrl).mockResolvedValue({
      success: true,
      data: { url: "url", key: "key" },
    });
    vi.mocked(updateProfileImageUrl).mockResolvedValue({
      success: false,
      error: null,
    } as unknown as Awaited<ReturnType<typeof updateProfileImageUrl>>);

    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });

    // Act: Trigger upload.
    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [mockFile] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    // Assert: Verify fallback generic error message for database updates.
    expect(toast.error).toHaveBeenCalledWith("Failed to update profile.");
  });

  /**
   * Test case to verify that the hook returns early if no files are found in the event.
   */
  it("does nothing when no file is selected", async () => {
    // Arrange: Render hook.
    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });

    // Act: Trigger an event with an empty file list.
    await act(async () => {
      await result.current.handleFileChange({
        target: { files: [] },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    // Assert: Verify no network or server activity occurred.
    expect(generateProfileImageUploadUrl).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the optimistic UI state and local storage are cleared correctly.
   */
  it("clears optimistic state correctly", () => {
    // Arrange: Render hook and set legacy optimistic data in storage.
    const { result } = renderHook(() => useProfileImage(), { wrapper: createWrapper() });
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    localStorage.setItem("optimistic-profile-image", "http://old-image.com");

    // Act: Invoke the state cleanup method.
    act(() => {
      result.current.clearOptimisticState();
    });

    // Assert: Verify state, storage, and cross-tab events were handled.
    expect(result.current.optimisticImageUrl).toBeNull();
    expect(localStorage.getItem("optimistic-profile-image")).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event));
  });
});
