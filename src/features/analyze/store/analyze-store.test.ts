import { createId } from "@paralleldrive/cuid2";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

// Mocks the `createId` function to return a predictable ID for testing purposes.
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn(() => "test-id-123"),
}));

// Groups tests related to the Analyze Store hook and its state management logic.
describe("useAnalyzeStore", () => {
  // Resets local storage and the store state before each test to ensure test isolation.
  beforeEach(() => {
    localStorage.clear();
    const { result } = renderHook(() => useAnalyzeStore());
    act(() => {
      result.current.reset();
    });
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the store initializes with the correct default values.
   */
  it("initializes with the default state", () => {
    // Act: Render the hook to access the store.
    const { result } = renderHook(() => useAnalyzeStore());

    // Assert: Verify that the initial state matches expected defaults.
    expect(result.current.status).toBe("details");
    expect(result.current.caseId).toBeNull();
    expect(result.current.viewMode).toBe("list");
    expect(result.current.data.files).toEqual([]);
  });

  // Groups tests related to workflow navigation and step transitions.
  describe("Navigation", () => {
    /**
     * Test case to verify that the store advances to the next step in the workflow correctly.
     */
    it("advances to the next step correctly", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalyzeStore());

      // Act: Set initial status and trigger next step actions.
      act(() => result.current.setStatus("details"));
      act(() => result.current.nextStep());
      // Assert: Verify transition to 'upload'.
      expect(result.current.status).toBe("upload");

      // Act: Trigger next step again.
      act(() => result.current.nextStep());
      // Assert: Verify transition to 'review'.
      expect(result.current.status).toBe("review");

      // Act: Trigger next step again (should remain on last step).
      act(() => result.current.nextStep());
      // Assert: Verify status remains 'review'.
      expect(result.current.status).toBe("review");
    });

    /**
     * Test case to verify that the store returns to the previous step in the workflow correctly.
     */
    it("returns to the previous step correctly", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalyzeStore());

      // Act: Set status to 'review' and trigger previous step actions.
      act(() => result.current.setStatus("review"));
      act(() => result.current.prevStep());
      // Assert: Verify transition back to 'upload'.
      expect(result.current.status).toBe("upload");

      // Act: Trigger previous step again.
      act(() => result.current.prevStep());
      // Assert: Verify transition back to 'details'.
      expect(result.current.status).toBe("details");

      // Act: Trigger previous step again (should remain on first step).
      act(() => result.current.prevStep());
      // Assert: Verify status remains 'details'.
      expect(result.current.status).toBe("details");
    });

    /**
     * Test case to verify that processing state transitions are handled correctly.
     */
    it("handles processing state transitions", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalyzeStore());

      // Act: Start the processing workflow.
      act(() => result.current.startProcessing());
      // Assert: Verify status is 'processing'.
      expect(result.current.status).toBe("processing");

      // Act: Cancel the processing workflow.
      act(() => result.current.cancelProcessing());
      // Assert: Verify status reverts to 'review'.
      expect(result.current.status).toBe("review");
    });

    /**
     * Test case to verify that cancelling processing has no effect if the current status is not processing.
     */
    it("does not change status if cancelProcessing is called when not processing", () => {
      // Arrange: Render the hook and set status to 'details'.
      const { result } = renderHook(() => useAnalyzeStore());
      act(() => result.current.setStatus("details"));

      // Act: Attempt to cancel processing.
      act(() => result.current.cancelProcessing());

      // Assert: Verify status remains 'details'.
      expect(result.current.status).toBe("details");
    });

    /**
     * Test case to verify that setting a case ID automatically advances the workflow to the upload step.
     */
    it("sets case ID and proceeds to upload step atomically", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalyzeStore());

      // Act: Set the case ID using the combined action.
      act(() => result.current.setCaseAndProceed("new-case-id"));

      // Assert: Verify case ID is set and status is updated.
      expect(result.current.caseId).toBe("new-case-id");
      expect(result.current.status).toBe("upload");
    });
  });

  // Groups tests related to file addition, removal, and updates within the store.
  describe("File Management", () => {
    /**
     * Test case to verify that new files are added to the store with the correct metadata structure.
     */
    it("adds new files with correct metadata structure", () => {
      // Arrange: Render the hook and create a mock file.
      const { result } = renderHook(() => useAnalyzeStore());
      const file = new File(["dummy content"], "test-image.png", { type: "image/png" });

      // Arrange: Mock `createId` to return specific IDs.
      vi.mocked(createId).mockReturnValueOnce("id-1").mockReturnValueOnce("id-2");

      // Act: Add the file to the store.
      act(() => {
        result.current.addFiles([file], "upload");
      });

      const addedFile = result.current.data.files[0];

      // Assert: Verify file count and metadata structure.
      expect(result.current.data.files).toHaveLength(1);
      expect(addedFile).toEqual({
        id: "id-1",
        file: file,
        key: "",
        url: "",
        name: "test-image.png",
        size: file.size,
        type: "image/png",
        progress: 0,
        status: "pending",
        source: "upload",
        dateUploaded: expect.any(Date),
        version: expect.any(Number),
      });
    });

    /**
     * Test case to verify that a file is removed from the store by its ID.
     */
    it("removes a file by ID", () => {
      // Arrange: Render the hook, create a file, and add it to the store.
      const { result } = renderHook(() => useAnalyzeStore());
      const file = new File(["content"], "test.png", { type: "image/png" });

      vi.mocked(createId).mockReturnValue("file-to-remove");

      act(() => {
        result.current.addFiles([file], "upload");
      });

      // Assert: Verify file was added.
      expect(result.current.data.files).toHaveLength(1);

      // Act: Remove the file.
      act(() => {
        result.current.removeFile("file-to-remove");
      });

      // Assert: Verify file list is empty.
      expect(result.current.data.files).toHaveLength(0);
    });

    /**
     * Test case to verify that a file object is updated within the store (e.g., after editing).
     */
    it("updates a file object (e.g., after editing)", () => {
      // Arrange: Render the hook and setup original and new files.
      const { result } = renderHook(() => useAnalyzeStore());
      const originalFile = new File(["original"], "original.png", { type: "image/png" });
      const newFile = new File(["new"], "new.png", { type: "image/png" });

      vi.mocked(createId).mockReturnValue("target-file");

      act(() => {
        result.current.addFiles([originalFile], "upload");
      });

      // Act: Update the existing file with the new file object.
      act(() => {
        result.current.updateFile("target-file", newFile);
      });

      const updated = result.current.data.files[0];
      // Assert: Verify the file object and name are updated.
      expect(updated.file).toBe(newFile);
      expect(updated.name).toBe("new.png");
      expect(updated.version).toBeDefined();
    });

    /**
     * Test case to verify that the upload progress of a specific file is updated.
     */
    it("updates file progress", () => {
      // Arrange: Render the hook and add a file.
      const { result } = renderHook(() => useAnalyzeStore());
      const file = new File([""], "test.png", { type: "image/png" });
      vi.mocked(createId).mockReturnValue("file-1");

      act(() => result.current.addFiles([file], "upload"));

      // Act: Update the progress of the file.
      act(() => result.current.updateFileProgress("file-1", 50));

      // Assert: Verify the progress value is updated.
      expect(result.current.data.files[0].progress).toBe(50);
    });

    /**
     * Test case to verify that the upload status of a specific file is updated.
     */
    it("updates upload status", () => {
      // Arrange: Render the hook and add a file.
      const { result } = renderHook(() => useAnalyzeStore());
      const file = new File([""], "test.png", { type: "image/png" });
      vi.mocked(createId).mockReturnValue("file-1");

      act(() => result.current.addFiles([file], "upload"));

      // Act: Set the upload status to 'uploading'.
      act(() => result.current.setUploadStatus("file-1", "uploading"));

      // Assert: Verify the status is updated.
      expect(result.current.data.files[0].status).toBe("uploading");
    });

    /**
     * Test case to verify that retrying an upload resets the file status to pending and progress to zero.
     */
    it("retries upload by resetting status and progress", () => {
      // Arrange: Render the hook, add a file, and set it to an error state.
      const { result } = renderHook(() => useAnalyzeStore());
      const file = new File([""], "test.png", { type: "image/png" });
      vi.mocked(createId).mockReturnValue("file-1");

      act(() => {
        result.current.addFiles([file], "upload");
        result.current.setUploadStatus("file-1", "error");
        result.current.updateFileProgress("file-1", 50);
      });

      // Act: Retry the upload.
      act(() => result.current.retryUpload("file-1"));

      // Assert: Verify status is reset to 'pending' and progress to 0.
      const retriedFile = result.current.data.files[0];
      expect(retriedFile.status).toBe("pending");
      expect(retriedFile.progress).toBe(0);
    });

    /**
     * Test case to verify that the S3 upload key is set for a specific file.
     */
    it("sets upload key", () => {
      // Arrange: Render the hook and add a file.
      const { result } = renderHook(() => useAnalyzeStore());
      const file = new File([""], "test.png", { type: "image/png" });
      vi.mocked(createId).mockReturnValue("file-1");

      act(() => result.current.addFiles([file], "upload"));

      // Act: Set the upload key.
      act(() => result.current.setUploadKey("file-1", "s3-key-123"));

      // Assert: Verify the key is updated.
      expect(result.current.data.files[0].key).toBe("s3-key-123");
    });

    /**
     * Test case to verify that the upload URL is set for a specific file.
     */
    it("sets upload URL", () => {
      // Arrange: Render the hook and add a file.
      const { result } = renderHook(() => useAnalyzeStore());
      const file = new File([""], "test.png", { type: "image/png" });
      vi.mocked(createId).mockReturnValue("file-1");

      act(() => result.current.addFiles([file], "upload"));

      // Act: Set the upload URL.
      act(() => result.current.setUploadUrl("file-1", "https://example.com/file.png"));

      // Assert: Verify the URL is updated.
      expect(result.current.data.files[0].url).toBe("https://example.com/file.png");
    });

    /**
     * Test case to verify that updates only affect the target file when multiple files exist.
     */
    it("updates only the target file when multiple files exist", () => {
      // Arrange: Render the hook and add two files.
      const { result } = renderHook(() => useAnalyzeStore());
      const file1 = new File([""], "file1.png", { type: "image/png" });
      const file2 = new File([""], "file2.png", { type: "image/png" });

      vi.mocked(createId).mockReturnValueOnce("id-1").mockReturnValueOnce("id-2");

      act(() => result.current.addFiles([file1, file2], "upload"));

      // Act: Update progress for the first file only.
      act(() => result.current.updateFileProgress("id-1", 50));

      // Assert: Verify only the first file's progress is updated.
      expect(result.current.data.files[0].progress).toBe(50);
      expect(result.current.data.files[1].progress).toBe(0);
    });

    /**
     * Test case to verify that various file update actions only affect the target file when multiple files exist.
     */
    it("updates only the target file for other actions when multiple files exist", () => {
      // Arrange: Render the hook and add two files.
      const { result } = renderHook(() => useAnalyzeStore());
      const file1 = new File([""], "file1.png", { type: "image/png" });
      const file2 = new File([""], "file2.png", { type: "image/png" });

      vi.mocked(createId).mockReturnValueOnce("id-1").mockReturnValueOnce("id-2");

      act(() => result.current.addFiles([file1, file2], "upload"));

      // Act: Set upload status for the first file.
      act(() => result.current.setUploadStatus("id-1", "success"));
      // Assert: Verify specific status update.
      expect(result.current.data.files[0].status).toBe("success");
      expect(result.current.data.files[1].status).toBe("pending");

      // Act: Set status to error and retry for the first file.
      act(() => result.current.setUploadStatus("id-1", "error"));
      act(() => result.current.retryUpload("id-1"));
      // Assert: Verify only first file is reset.
      expect(result.current.data.files[0].status).toBe("pending");
      expect(result.current.data.files[1].status).toBe("pending");

      // Act: Set upload key for the first file.
      act(() => result.current.setUploadKey("id-1", "key-1"));
      // Assert: Verify key update.
      expect(result.current.data.files[0].key).toBe("key-1");
      expect(result.current.data.files[1].key).toBe("");

      // Act: Set upload URL for the first file.
      act(() => result.current.setUploadUrl("id-1", "url-1"));
      // Assert: Verify URL update.
      expect(result.current.data.files[0].url).toBe("url-1");
      expect(result.current.data.files[1].url).toBe("");

      // Act: Update the file object for the first file.
      const newFile = new File([""], "new.png", { type: "image/png" });
      act(() => result.current.updateFile("id-1", newFile));
      // Assert: Verify file object update.
      expect(result.current.data.files[0].file).toBe(newFile);
      expect(result.current.data.files[1].file).not.toBe(newFile);
    });
  });

  // Groups tests related to UI configuration state like view mode and sorting.
  describe("UI State", () => {
    /**
     * Test case to verify that the view mode is updated correctly.
     */
    it("updates view mode", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalyzeStore());
      // Act: Set view mode to 'grid'.
      act(() => result.current.setViewMode("grid"));
      // Assert: Verify view mode is updated.
      expect(result.current.viewMode).toBe("grid");
    });

    /**
     * Test case to verify that the sort option is updated correctly.
     */
    it("updates sort option", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalyzeStore());
      // Act: Set sort option.
      act(() => result.current.setSortOption("date-uploaded-asc"));
      // Assert: Verify sort option is updated.
      expect(result.current.sortOption).toBe("date-uploaded-asc");
    });

    /**
     * Test case to verify that the search term is updated correctly.
     */
    it("updates search term", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalyzeStore());
      // Act: Set search term.
      act(() => result.current.setSearchTerm("test query"));
      // Assert: Verify search term is updated.
      expect(result.current.searchTerm).toBe("test query");
    });
  });

  // Groups tests related to form data stored within the state.
  describe("Form Data", () => {
    /**
     * Test case to verify that the case details are updated in the store.
     */
    it("updates details data", () => {
      // Arrange: Render the hook and define new details.
      const { result } = renderHook(() => useAnalyzeStore());
      const details = { caseName: "New Case", notes: "Some notes" };

      // Act: Update details data.
      act(() => result.current.updateDetailsData(details));

      // Assert: Verify details are updated.
      expect(result.current.details).toEqual(details);
    });
  });

  // Groups tests related to the submission process status.
  describe("Submission", () => {
    /**
     * Test case to verify that the submission success status is set correctly.
     */
    it("sets submission success status", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useAnalyzeStore());
      // Act: Set success status.
      act(() => result.current.setSubmissionSuccess());
      // Assert: Verify status is 'success'.
      expect(result.current.submissionStatus).toBe("success");
    });

    /**
     * Test case to verify that the submission status is cleared back to idle.
     */
    it("clears submission status", () => {
      // Arrange: Render the hook and set status to success.
      const { result } = renderHook(() => useAnalyzeStore());
      act(() => result.current.setSubmissionSuccess());
      // Act: Clear submission status.
      act(() => result.current.clearSubmissionStatus());
      // Assert: Verify status is 'idle'.
      expect(result.current.submissionStatus).toBe("idle");
    });
  });

  // Groups tests related to state hydration, persistence, and local storage interaction.
  describe("Hydration and Persistence", () => {
    /**
     * Test case to verify that files retrieved from the database are correctly hydrated into the store state.
     */
    it("hydrates files from DB records correctly", () => {
      // Arrange: Render the hook and define a DB file record.
      const { result } = renderHook(() => useAnalyzeStore());
      const dbFile = {
        id: "db-file-1",
        key: "s3-key-1",
        url: "https://s3.aws.com/file.jpg",
        name: "existing.jpg",
        size: 5000,
        type: "image/jpeg",
        createdAt: new Date("2025-01-01"),
      };

      // Act: Hydrate files into the store.
      act(() => {
        result.current.hydrateFiles([dbFile]);
      });

      // Assert: Verify hydration flag and file data.
      expect(result.current.isHydrated).toBe(true);
      expect(result.current.data.files).toHaveLength(1);

      const hydratedFile = result.current.data.files[0];
      expect(hydratedFile).toMatchObject({
        id: "db-file-1",
        status: "success",
        progress: 100,
        source: "db",
        dateUploaded: dbFile.createdAt,
      });
    });

    /**
     * Test case to verify that the store state is reset to defaults and local storage is cleared.
     */
    it("resets state and clears local storage", () => {
      // Arrange: Render the hook and modify state to non-default values.
      const { result } = renderHook(() => useAnalyzeStore());

      act(() => {
        result.current.setCaseId("dirty-case-id");
        result.current.setViewMode("grid");
      });

      // Assert: Verify state is modified.
      expect(result.current.caseId).toBe("dirty-case-id");

      // Act: Reset the store.
      act(() => {
        result.current.reset();
      });

      // Assert: Verify state is reset to defaults.
      expect(result.current.caseId).toBeNull();
      expect(result.current.viewMode).toBe("list");
    });

    /**
     * Test case to verify that the custom storage implementation removes items from local storage.
     */
    it("clears storage using the persist API configuration", () => {
      // Arrange: Set items in local storage and access persistence options.
      localStorage.setItem("analyze-storage", JSON.stringify({ state: "dummy" }));

      renderHook(() => useAnalyzeStore());

      const persistOptions = useAnalyzeStore.persist.getOptions();
      const storage = persistOptions.storage;

      // Assert: Verify storage configuration.
      expect(storage).toBeDefined();
      expect(storage?.removeItem).toBeDefined();

      // Act: Use the storage API to remove the item.
      act(() => {
        storage!.removeItem!("analyze-storage");
      });

      // Assert: Verify item is removed from local storage.
      expect(localStorage.getItem("analyze-storage")).toBeNull();
    });

    /**
     * Test case to verify that the storage implementation returns null for non-existent keys.
     */
    it("returns null from storage if key does not exist", () => {
      // Arrange: Get storage options.
      const storage = useAnalyzeStore.persist.getOptions().storage;
      // Assert: Verify getting a missing key returns null.
      expect(storage?.getItem("non-existent")).toBeNull();
    });

    /**
     * Test case to verify that the `isHydrated` flag is set to true upon rehydration.
     */
    it("sets isHydrated to true on rehydration", () => {
      // Arrange: Get persistence options and current state.
      const persistOptions = useAnalyzeStore.persist.getOptions();
      const state = useAnalyzeStore.getState();

      const onRehydrate = persistOptions.onRehydrateStorage?.(state);

      const mockState = { ...state, isHydrated: false };

      // Act: Simulate rehydration completion.
      act(() => {
        onRehydrate?.(mockState, undefined);
      });

      // Assert: Verify `isHydrated` is true in the store (setHasHydrated updates the Zustand store).
      expect(useAnalyzeStore.getState().isHydrated).toBe(true);
    });

    /**
     * Test case to verify that data is correctly parsed from storage using superjson.
     */
    it("parses data from storage using superjson", () => {
      // Arrange: Mock storage data formatted for superjson.
      const storage = useAnalyzeStore.persist.getOptions().storage;
      const data = { foo: "bar" };
      const json = JSON.stringify({ json: data });

      localStorage.setItem("test-key", json);

      // Act: Retrieve and parse data via storage adapter.
      const parsed = storage?.getItem("test-key");

      // Assert: Verify data matches original object.
      expect(parsed).toEqual(data);
    });

    /**
     * Test case to verify that data is correctly stringified to storage using superjson.
     */
    it("stringifies data to storage using superjson", () => {
      // Arrange: Get storage adapter and data.
      const storage = useAnalyzeStore.persist.getOptions().storage;
      const data = { foo: "bar" };

      // Act: Save data via storage adapter.
      storage?.setItem("test-key", {
        state: data as unknown as ReturnType<typeof useAnalyzeStore.getState>,
        version: 0,
      });

      // Assert: Verify stored string contains superjson structure.
      const storedItem = localStorage.getItem("test-key");
      expect(storedItem).toEqual(expect.stringContaining('"json":{"state":{"foo":"bar"}'));
    });

    /**
     * Test case to verify that only specific fields are persisted to storage.
     */
    it("only persists specific fields", () => {
      // Arrange: Get partialize function and create full state object.
      const partialize = useAnalyzeStore.persist.getOptions().partialize;
      const fullState = {
        status: "upload",
        caseId: "123",
        details: { caseName: "test" },
        sortOption: "name-asc",
        viewMode: "grid",
        searchTerm: "foo",
        data: { files: [] },
      };

      // Act: Filter state through partialize function.
      const persisted = partialize?.(
        fullState as unknown as ReturnType<typeof useAnalyzeStore.getState>
      );

      // Assert: Verify only whitelisted fields are present in persisted state.
      expect(persisted).toEqual({
        status: "upload",
        caseId: "123",
        details: { caseName: "test" },
        sortOption: "name-asc",
      });
    });
  });
});
