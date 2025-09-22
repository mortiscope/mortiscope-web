import { revalidatePath } from "next/cache";
import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, detections, uploads } from "@/db/schema";
import { deleteImage } from "@/features/images/actions/delete-image";
import { s3 } from "@/lib/aws";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database module to control query responses and data manipulation.
vi.mock("@/db", () => ({
  db: {
    query: {
      uploads: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      analysisResults: {
        findFirst: vi.fn(),
      },
      detections: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock the S3 library wrapper to intercept send calls.
vi.mock("@/lib/aws", () => ({
  s3: { send: vi.fn() },
}));

// Mock configuration to provide consistent S3 bucket names.
vi.mock("@/lib/config", () => ({
  config: { aws: { s3BucketName: "test-bucket" } },
}));

// Mock Next.js cache revalidation to track calls without actual cache operations.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock constants to define stage hierarchy for recalculation logic.
vi.mock("@/lib/constants", () => ({
  STAGE_HIERARCHY: {
    pupa: 4,
    instar_3: 3,
    instar_2: 2,
    instar_1: 1,
    adult: 0,
  },
}));

// Helper function to mock the chainable database select method.
const mockDbSelect = () => {
  const where = vi.fn();
  const from = vi.fn().mockReturnValue({ where });

  vi.mocked(db.select).mockReturnValue({ from } as unknown as ReturnType<typeof db.select>);

  return { from, where };
};

// Helper function to mock the chainable database delete method.
const mockDbDelete = () => {
  const where = vi.fn();
  vi.mocked(db.delete).mockReturnValue({ where } as unknown as ReturnType<typeof db.delete>);
  return { where };
};

// Helper function to mock the chainable database update method.
const mockDbUpdate = () => {
  const where = vi.fn();
  const set = vi.fn().mockReturnValue({ where });
  vi.mocked(db.update).mockReturnValue({ set } as unknown as ReturnType<typeof db.update>);
  return { set, where };
};

type UploadRecord = typeof uploads.$inferSelect;
type AnalysisResult = typeof analysisResults.$inferSelect;
type Detection = typeof detections.$inferSelect;

// Groups tests for the `deleteImage` server action functionality.
describe("deleteImage", () => {
  // Reset all mocks before every test to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that an unauthorized error is returned if no session exists.
   */
  it("returns unauthorized error if no session exists", async () => {
    // Arrange: Mock the authentication to return null (no session).
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to execute the action without a user session.
    const result = await deleteImage({ imageId: "img-1" });

    // Assert: Verify the response contains the specific unauthorized error message.
    expect(result).toEqual({ error: "Unauthorized: You must be logged in." });
    expect(db.query.uploads.findFirst).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that an error is returned if the image is not found or not owned by the user.
   */
  it("returns error if image is not found or not owned by user", async () => {
    // Arrange: Mock session and simulate image lookup returning undefined.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: "user-1" } } as Session);
    vi.mocked(db.query.uploads.findFirst).mockResolvedValue(undefined);

    // Act: Call the action for a non-existent image.
    const result = await deleteImage({ imageId: "img-1" });

    // Assert: Verify the error message indicates lack of permission or existence.
    expect(result).toEqual({
      error: "Image not found or you do not have permission to delete it.",
    });
  });

  /**
   * Test case to verify that deletion is prevented if the image is the last one in the case.
   */
  it("prevents deletion if it is the last image in the case", async () => {
    // Arrange: Mock session and simulate finding an existing image.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: "user-1" } } as Session);

    vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
      key: "s3-key",
      caseId: "case-1",
      name: "test.jpg",
    } as unknown as UploadRecord);

    // Arrange: Mock the count query to return 1, indicating this is the last image.
    const { where } = mockDbSelect();
    where.mockResolvedValue([{ imageCount: 1 }]);

    // Act: Attempt to delete the last image.
    const result = await deleteImage({ imageId: "img-1" });

    // Assert: Verify the error prevents deleting the last image and S3 is not called.
    expect(result).toEqual({ error: "A case must have at least one image." });
    expect(s3.send).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the image is successfully deleted from S3 and the database.
   */
  it("successfully deletes image from S3 and DB", async () => {
    // Arrange: Mock session and simulate finding an image in a case with multiple images.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: "user-1" } } as Session);

    vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
      key: "s3-key",
      caseId: "case-1",
      name: "test.jpg",
    } as unknown as UploadRecord);

    // Arrange: Mock the count query to return 2, allowing deletion.
    const { where: selectWhere } = mockDbSelect();
    selectWhere.mockResolvedValue([{ imageCount: 2 }]);

    // Arrange: Mock the delete operation to resolve successfully.
    const { where: deleteWhere } = mockDbDelete();
    deleteWhere.mockResolvedValue(undefined);

    // Arrange: Mock related data for recalculation logic.
    vi.mocked(db.query.analysisResults.findFirst).mockResolvedValue({
      stageUsedForCalculation: "pupa",
    } as unknown as AnalysisResult);
    vi.mocked(db.query.uploads.findMany).mockResolvedValue([
      { id: "other-img" },
    ] as unknown as UploadRecord[]);
    vi.mocked(db.query.detections.findMany).mockResolvedValue([
      { label: "pupa" },
    ] as unknown as Detection[]);

    // Act: Execute the deletion.
    const result = await deleteImage({ imageId: "img-1" });

    // Assert: Verify S3 delete command was sent with correct bucket and key.
    expect(s3.send).toHaveBeenCalled();
    expect(s3.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { Bucket: "test-bucket", Key: "s3-key" },
      })
    );

    // Assert: Verify database delete was called.
    expect(db.delete).toHaveBeenCalled();

    // Assert: Verify the path was revalidated.
    expect(revalidatePath).toHaveBeenCalledWith("/results/case-1");

    // Assert: Verify the success message.
    expect(result).toEqual({ success: "test.jpg successfully deleted." });
  });

  // Groups tests related to the recalculation logic when an image is deleted.
  describe("Recalculation Logic", () => {
    // Setup common mocks for recalculation scenarios.
    beforeEach(() => {
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: "user-1" } } as Session);

      vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
        key: "s3-key",
        caseId: "case-1",
        name: "test.jpg",
      } as unknown as UploadRecord);

      const { where } = mockDbSelect();
      where.mockResolvedValue([{ imageCount: 2 }]);

      mockDbDelete();
    });

    /**
     * Test case to verify that recalculation is triggered if the oldest stage changes after deletion.
     */
    it("triggers recalculation if the oldest stage changes", async () => {
      // Arrange: Mock database update.
      const { set } = mockDbUpdate();

      // Arrange: Mock existing result as "instar_1", but remaining detections as "pupa" (older).
      vi.mocked(db.query.analysisResults.findFirst).mockResolvedValue({
        stageUsedForCalculation: "instar_1",
      } as unknown as AnalysisResult);

      vi.mocked(db.query.uploads.findMany).mockResolvedValue([
        { id: "other-img" },
      ] as unknown as UploadRecord[]);

      vi.mocked(db.query.detections.findMany).mockResolvedValue([
        { label: "pupa" },
      ] as unknown as Detection[]);

      // Act: Delete the image.
      await deleteImage({ imageId: "img-1" });

      // Assert: Verify that the case was marked for recalculation.
      expect(db.update).toHaveBeenCalled();
      expect(set).toHaveBeenCalledWith({ recalculationNeeded: true });
    });

    /**
     * Test case to verify that recalculation is NOT triggered if the oldest stage remains the same.
     */
    it("does NOT trigger recalculation if oldest stage remains the same", async () => {
      // Arrange: Mock database update.
      mockDbUpdate();

      // Arrange: Mock existing result as "pupa" and remaining detections include "pupa".
      vi.mocked(db.query.analysisResults.findFirst).mockResolvedValue({
        stageUsedForCalculation: "pupa",
      } as unknown as AnalysisResult);

      vi.mocked(db.query.uploads.findMany).mockResolvedValue([
        { id: "other-img" },
      ] as unknown as UploadRecord[]);

      vi.mocked(db.query.detections.findMany).mockResolvedValue([
        { label: "pupa" },
        { label: "instar_1" },
      ] as unknown as Detection[]);

      // Act: Delete the image.
      await deleteImage({ imageId: "img-1" });

      // Assert: Verify that no update was triggered.
      expect(db.update).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that recalculation is triggered when no detections remain (null stage).
     */
    it("handles case where no detections remain (null stage)", async () => {
      // Arrange: Mock database update.
      const { set } = mockDbUpdate();

      // Arrange: Mock existing result as "pupa" but remaining detections contain only "adult" (mapped to 0 or handled differently).
      vi.mocked(db.query.analysisResults.findFirst).mockResolvedValue({
        stageUsedForCalculation: "pupa",
      } as unknown as AnalysisResult);

      vi.mocked(db.query.uploads.findMany).mockResolvedValue([
        { id: "other-img" },
      ] as unknown as UploadRecord[]);

      vi.mocked(db.query.detections.findMany).mockResolvedValue([
        { label: "adult" },
      ] as unknown as Detection[]);

      // Act: Delete the image.
      await deleteImage({ imageId: "img-1" });

      // Assert: Verify that recalculation is flagged.
      expect(db.update).toHaveBeenCalled();
      expect(set).toHaveBeenCalledWith({ recalculationNeeded: true });
    });

    /**
     * Test case to verify that the oldest stage is correctly identified even when inputs require sorting.
     */
    it("correctly identifies oldest stage when inputs need sorting", async () => {
      // Arrange: Mock database update.
      mockDbUpdate();

      // Arrange: Mock existing result as "pupa" and ensure mixed order detections still yield "pupa".
      vi.mocked(db.query.analysisResults.findFirst).mockResolvedValue({
        stageUsedForCalculation: "pupa",
      } as unknown as AnalysisResult);

      vi.mocked(db.query.uploads.findMany).mockResolvedValue([
        { id: "other-img" },
      ] as unknown as UploadRecord[]);

      vi.mocked(db.query.detections.findMany).mockResolvedValue([
        { label: "instar_1" },
        { label: "pupa" },
      ] as unknown as Detection[]);

      // Act: Delete the image.
      await deleteImage({ imageId: "img-1" });

      // Assert: Verify no update is needed because "pupa" is still present and valid.
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  /**
   * Test case to verify that an image not associated with a case is successfully deleted.
   */
  it("successfully deletes image not associated with a case", async () => {
    // Arrange: Mock session and find an orphaned image (null caseId).
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: "user-1" } } as Session);

    vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
      key: "s3-key-orphan",
      caseId: null,
      name: "orphan.jpg",
    } as unknown as UploadRecord);

    // Arrange: Mock delete operation.
    const { where: deleteWhere } = mockDbDelete();
    deleteWhere.mockResolvedValue(undefined);

    // Act: Delete the orphaned image.
    const result = await deleteImage({ imageId: "img-orphan" });

    // Assert: Verify S3 delete called with correct key.
    expect(s3.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { Bucket: "test-bucket", Key: "s3-key-orphan" },
      })
    );

    // Assert: Verify database delete called.
    expect(db.delete).toHaveBeenCalled();

    // Assert: Verify no case-related logic (recalculation or revalidation) ran.
    expect(db.query.analysisResults.findFirst).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();

    // Assert: Verify success message for orphaned file.
    expect(result).toEqual({ success: "orphan.jpg successfully deleted." });
  });

  /**
   * Test case to verify that detections with unknown stages are handled by defaulting to hierarchy 0.
   */
  it("handles detections with unknown stages (defaults to hierarchy 0)", async () => {
    // Arrange: Mock session and image data.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: "user-1" } } as Session);

    vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
      key: "s3-key",
      caseId: "case-1",
      name: "test.jpg",
    } as unknown as UploadRecord);

    const { where: selectWhere } = mockDbSelect();
    selectWhere.mockResolvedValue([{ imageCount: 2 }]);

    mockDbDelete().where.mockResolvedValue(undefined);
    mockDbUpdate();

    // Arrange: Setup analysis result and detection with an unknown label.
    vi.mocked(db.query.analysisResults.findFirst).mockResolvedValue({
      stageUsedForCalculation: "pupa",
    } as unknown as AnalysisResult);

    vi.mocked(db.query.uploads.findMany).mockResolvedValue([
      { id: "other-img" },
    ] as unknown as UploadRecord[]);

    vi.mocked(db.query.detections.findMany).mockResolvedValue([
      { label: "magic_stage" },
    ] as unknown as Detection[]);

    // Act: Delete the image.
    await deleteImage({ imageId: "img-1" });

    // Assert: Verify that update logic was triggered (implying recalculation due to hierarchy mismatch).
    expect(db.update).toHaveBeenCalled();
  });

  /**
   * Test case to verify handling of race conditions where remaining uploads are empty despite count indicating otherwise.
   */
  it("handles race condition where remaining uploads are empty despite count > 1", async () => {
    // Arrange: Mock session and image data.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: "user-1" } } as Session);

    vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
      key: "s3-key",
      caseId: "case-1",
      name: "test.jpg",
    } as unknown as UploadRecord);

    const { where: selectWhere } = mockDbSelect();
    selectWhere.mockResolvedValue([{ imageCount: 2 }]);

    const { where: deleteWhere } = mockDbDelete();
    deleteWhere.mockResolvedValue(undefined);

    const { set } = mockDbUpdate();

    // Arrange: Simulate race condition - findMany returns empty array despite count check passing previously.
    vi.mocked(db.query.uploads.findMany).mockResolvedValue([] as unknown as UploadRecord[]);

    // Act: Delete the image.
    await deleteImage({ imageId: "img-1" });

    // Assert: Verify that detections were not queried because no uploads were found.
    expect(db.query.detections.findMany).not.toHaveBeenCalled();

    vi.mocked(db.query.analysisResults.findFirst).mockResolvedValue({
      stageUsedForCalculation: "pupa",
    } as unknown as AnalysisResult);

    // Assert: Verify that recalculation is forced due to the inconsistency.
    expect(db.update).toHaveBeenCalledWith(cases);
    expect(set).toHaveBeenCalledWith({ recalculationNeeded: true });
  });

  // Groups tests related to the display name logic for the deletion success message.
  describe("Display Name Logic", () => {
    // Setup common mocks for display name tests.
    beforeEach(() => {
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: { id: "user-1" } } as Session);
      vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
        key: "key",
        caseId: null,
        name: "db-name.jpg",
      } as unknown as UploadRecord);
      mockDbDelete().where.mockResolvedValue(undefined);
    });

    /**
     * Test case to verify that the provided image name argument is used if available.
     */
    it("uses provided imageName argument if available", async () => {
      // Act: Call delete with an explicit image name.
      const result = await deleteImage({ imageId: "img-1", imageName: "Custom Name" });
      // Assert: Verify the custom name is in the success message.
      expect(result.success).toBe("Custom Name successfully deleted.");
    });

    /**
     * Test case to verify that the database name is used if the image name argument is missing.
     */
    it("uses database name if imageName argument is missing", async () => {
      // Act: Call delete without an explicit image name.
      const result = await deleteImage({ imageId: "img-1" });
      // Assert: Verify the name from the DB mock is used.
      expect(result.success).toBe("db-name.jpg successfully deleted.");
    });

    /**
     * Test case to verify that the display name falls back to 'File' if both provided and database names are missing.
     */
    it("falls back to 'File' if both provided name and DB name are missing", async () => {
      // Arrange: Mock the DB to return a null name.
      vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
        key: "key",
        caseId: null,
        name: null,
      } as unknown as UploadRecord);

      // Act: Call delete.
      const result = await deleteImage({ imageId: "img-1" });
      // Assert: Verify the fallback name is used.
      expect(result.success).toBe("File successfully deleted.");
    });
  });
});
