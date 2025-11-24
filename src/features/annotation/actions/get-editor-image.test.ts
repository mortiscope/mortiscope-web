import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getEditorImage } from "@/features/annotation/actions/get-editor-image";

// Mock the authentication module to control session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client and its nested query structure for cases and uploads.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findFirst: vi.fn(),
      },
      uploads: {
        findFirst: vi.fn(),
      },
    },
  },
}));

/**
 * Test suite for the `getEditorImage` server action.
 */
describe("getEditorImage", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  // Reset mocks and suppress console errors before each test for a clean environment.
  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // Restore console functionality after each test to avoid side effects.
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  /**
   * Test case to ensure the action fails gracefully when no active session is found.
   */
  it("returns null when the user is not authenticated", async () => {
    // Arrange: Mock `auth` to return a null session.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to fetch the editor image.
    const result = await getEditorImage("image-1", "case-1");

    // Assert: Verify that the result is null.
    expect(result).toBeNull();
  });

  /**
   * Test case to verify that access is denied if the case does not exist or permission is lacking.
   */
  it("returns null when the case is not found or does not belong to the user", async () => {
    // Arrange: Mock a valid session but simulate a failed database lookup for the case.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
      expires: "2025-01-01",
    });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue(undefined);

    // Act: Attempt to fetch the editor image for the non-existent or inaccessible case.
    const result = await getEditorImage("image-1", "case-1");

    // Assert: Verify that the result is null.
    expect(result).toBeNull();
  });

  /**
   * Test case to ensure images cannot be retrieved for cases that are still in draft status.
   */
  it("returns null when the case status is draft", async () => {
    // Arrange: Mock a valid session and a case that is in `draft` status.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
      expires: "2025-01-01",
    });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: "case-1",
      status: "draft",
    });

    // Act: Attempt to fetch the editor image.
    const result = await getEditorImage("image-1", "case-1");

    // Assert: Verify that the result is null due to the forbidden status.
    expect(result).toBeNull();
  });

  /**
   * Test case to verify failure behavior when the specific image upload record is missing.
   */
  it("returns null when the image upload is not found", async () => {
    // Arrange: Mock a valid session and case, but return undefined for the upload lookup.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
      expires: "2025-01-01",
    });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: "case-1",
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue(undefined);

    // Act: Attempt to fetch the editor image.
    const result = await getEditorImage("image-1", "case-1");

    // Assert: Verify that the result is null.
    expect(result).toBeNull();
  });

  /**
   * Test case to verify the successful retrieval and formatting of image and detection data.
   */
  it("returns formatted image data with detections when retrieval is successful", async () => {
    // Arrange: Mock session, active case, and a complete upload record with nested detections.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
      expires: "2025-01-01",
    });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: "case-1",
      status: "active",
    });

    const mockDate = new Date("2025-01-01");
    const mockUpload = {
      id: "image-1",
      name: "sample-image.jpg",
      url: "https://example.com/sample-image.jpg",
      size: 2048,
      createdAt: mockDate,
      detections: [
        { id: "det-1", label: "adult", confidence: 0.95, deletedAt: null },
        { id: "det-2", label: "pupa", confidence: 0.88, deletedAt: null },
      ],
      caseId: "case-1",
      userId: "user-1",
      key: "sample-key",
      width: 1920,
      height: 1080,
      type: "image/jpeg",
    };

    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue(mockUpload);

    // Act: Fetch the image data.
    const result = await getEditorImage("image-1", "case-1");

    // Assert: Verify the returned object contains correctly mapped fields and a proxy URL.
    expect(result).toEqual({
      id: "image-1",
      name: "sample-image.jpg",
      url: "/api/images/image-1",
      size: 2048,
      dateUploaded: mockDate,
      detections: mockUpload.detections,
    });
  });

  /**
   * Test case to verify error handling and logging when a database exception occurs.
   */
  it("returns null and logs an error if a database exception occurs", async () => {
    // Arrange: Force the database query to throw an error.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
      expires: "2025-01-01",
    });
    (db.query.cases.findFirst as unknown as Mock).mockRejectedValue(
      new Error("Database connection error")
    );

    // Act: Attempt to fetch the editor image.
    const result = await getEditorImage("image-1", "case-1");

    // Assert: Verify that the function returns null and triggers a console error log.
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith("Error fetching editor image:", expect.any(Error));
  });
});
