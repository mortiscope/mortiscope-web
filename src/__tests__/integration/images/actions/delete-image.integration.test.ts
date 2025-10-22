"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, detections, uploads, users } from "@/db/schema";
import { deleteImage } from "@/features/images/actions/delete-image";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the AWS S3 client to prevent actual network requests during testing.
vi.mock("@aws-sdk/client-s3", () => ({
  DeleteObjectCommand: vi.fn(),
}));

// Mock the internal S3 utility to control object deletion behavior.
vi.mock("@/lib/aws", () => ({
  s3: {
    send: vi.fn(),
  },
}));

// Mock the Next.js cache module to verify path revalidation logic.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the application configuration to provide a consistent test bucket name.
vi.mock("@/lib/config", () => ({
  config: {
    aws: {
      s3BucketName: "mock-bucket",
    },
  },
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `deleteImage` server action.
 */
describe("deleteImage (integration)", () => {
  const testUserId = mockUsers.primaryUser.id;

  /**
   * Clears mocks and resets the database state before each individual test.
   */
  beforeEach(async () => {
    // Arrange: Reset all mocks to their initial state.
    vi.clearAllMocks();
    // Arrange: Wipe the database to ensure test isolation.
    resetMockDb();

    // Arrange: Seed the database with a primary test user.
    await db.insert(users).values({
      id: testUserId,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Helper function to insert a case record into the database.
   */
  const insertCase = async (caseId: string) => {
    await db.insert(cases).values({
      id: caseId,
      userId: testUserId,
      caseName: "Test Case",
      status: "active",
      temperatureCelsius: 25,
      locationRegion: "Region",
      locationProvince: "Province",
      locationCity: "City",
      locationBarangay: "Barangay",
      caseDate: new Date(),
    });
  };

  /**
   * Helper function to insert an upload record into the database.
   */
  const insertUpload = async (
    uploadId: string,
    caseId: string | null,
    name: string = "test-image.jpg"
  ) => {
    await db.insert(uploads).values({
      id: uploadId,
      caseId: caseId,
      userId: testUserId,
      name: name,
      key: `uploads/${uploadId}`,
      url: `https://example.com/uploads/${uploadId}`,
      size: 1024,
      type: "image/jpeg",
      width: 1920,
      height: 1080,
    });
  };

  /**
   * Helper function to insert a detection record into the database.
   */
  const insertDetection = async (detectionId: string, uploadId: string, label: string) => {
    await db.insert(detections).values({
      id: detectionId,
      uploadId: uploadId,
      label: label,
      originalLabel: label,
      confidence: 0.9,
      originalConfidence: 0.9,
      xMin: 0,
      yMin: 0,
      xMax: 100,
      yMax: 100,
      createdById: testUserId,
      deletedAt: null,
    });
  };

  /**
   * Test suite for verifying authentication requirements of the action.
   */
  describe("authentication", () => {
    /**
     * Verifies that unauthenticated requests are rejected.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Mock the session to return null.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to delete an image without a session.
      const result = await deleteImage({
        imageId: "clm8x9y0z0001ab2c3d4e5f6g",
        imageName: "test.jpg",
      });

      // Assert: Verify the unauthorized error message is returned.
      expect(result).toEqual({ error: "Unauthorized: You must be logged in." });
    });

    /**
     * Verifies that sessions missing a user identifier are rejected.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Mock a session object missing the `id` property.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to delete an image with an incomplete session.
      const result = await deleteImage({
        imageId: "clm8x9y0z0001ab2c3d4e5f6g",
        imageName: "test.jpg",
      });

      // Assert: Verify the unauthorized error message is returned.
      expect(result).toEqual({ error: "Unauthorized: You must be logged in." });
    });
  });

  /**
   * Test suite for verifying image existence and ownership logic.
   */
  describe("image lookup", () => {
    /**
     * Prepares an authenticated session for lookup tests.
     */
    beforeEach(() => {
      // Arrange: Configure the mock session for the test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies handling of non-existent image identifiers.
     */
    it("returns error when image not found", async () => {
      // Act: Attempt to delete an image using a non-existent `imageId`.
      const result = await deleteImage({
        imageId: "cln9y0z1a0002bc3d4e5f6g7h",
        imageName: "test.jpg",
      });

      // Assert: Verify the not found error message is returned.
      expect(result).toEqual({
        error: "Image not found or you do not have permission to delete it.",
      });
    });

    /**
     * Verifies that users cannot delete images they do not own.
     */
    it("returns error when image belongs to another user", async () => {
      // Arrange: Insert a different user into the database.
      await db.insert(users).values({
        id: "clo0z1a2b0003cd4e5f6g7h8i",
        email: "other@example.com",
        name: "Other User",
      });

      // Arrange: Create an upload record owned by the other user.
      await db.insert(uploads).values({
        id: "clp1a2b3c0004de5f6g7h8i9j",
        caseId: null,
        userId: "clo0z1a2b0003cd4e5f6g7h8i",
        name: "other-image.jpg",
        key: "uploads/clp1a2b3c0004de5f6g7h8i9j",
        url: "https://example.com/uploads/clp1a2b3c0004de5f6g7h8i9j",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      // Act: Attempt to delete the other user's image.
      const result = await deleteImage({
        imageId: "clp1a2b3c0004de5f6g7h8i9j",
        imageName: "other-image.jpg",
      });

      // Assert: Verify the permission error message is returned.
      expect(result).toEqual({
        error: "Image not found or you do not have permission to delete it.",
      });
    });
  });

  /**
   * Test suite for business rules regarding minimum image requirements.
   */
  describe("last image validation", () => {
    /**
     * Prepares an authenticated session for validation tests.
     */
    beforeEach(() => {
      // Arrange: Configure the mock session for the test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that a case cannot be left with zero images.
     */
    it("returns error when trying to delete the last image in a case", async () => {
      // Arrange: Setup a case and only a single image upload for it.
      await insertCase("clq2b3c4d0005ef6g7h8i9j0k");
      await insertUpload("clr3c4d5e0006fg7h8i9j0k1l", "clq2b3c4d0005ef6g7h8i9j0k");

      // Act: Attempt to delete the sole image associated with the case.
      const result = await deleteImage({
        imageId: "clr3c4d5e0006fg7h8i9j0k1l",
        imageName: "test.jpg",
      });

      // Assert: Verify the validation error regarding the minimum image count.
      expect(result).toEqual({ error: "A case must have at least one image." });
    });
  });

  /**
   * Test suite for successful image deletion flows.
   */
  describe("successful deletion", () => {
    /**
     * Prepares the session and S3 mocks for successful operations.
     */
    beforeEach(async () => {
      // Arrange: Configure the mock session for the test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);

      // Arrange: Mock the S3 send method to simulate a successful object deletion.
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockResolvedValue({} as never);
    });

    /**
     * Verifies deletion of an image not associated with any case.
     */
    it("successfully deletes image without case", async () => {
      // Arrange: Insert a standalone upload into the database.
      await insertUpload("cls4d5e6f0007gh8i9j0k1l2m", null, "standalone.jpg");

      // Act: Execute the deletion action for the standalone image.
      const result = await deleteImage({
        imageId: "cls4d5e6f0007gh8i9j0k1l2m",
        imageName: "standalone.jpg",
      });

      // Assert: Verify the success response contains the expected text.
      expect(result.success).toContain("successfully deleted");

      // Assert: Confirm the `uploads` record is removed from the database.
      const deletedUpload = await db.query.uploads.findFirst({
        where: (uploads, { eq }) => eq(uploads.id, "cls4d5e6f0007gh8i9j0k1l2m"),
      });
      expect(deletedUpload).toBeUndefined();
    });

    /**
     * Verifies that the success message utilizes the custom name if provided.
     */
    it("uses provided imageName in success message", async () => {
      // Arrange: Insert an upload with a database-specific name.
      await insertUpload("clt5e6f7g0008hi9j0k1l2m3n", null, "db-name.jpg");

      // Act: Execute the deletion using a custom display name.
      const result = await deleteImage({
        imageId: "clt5e6f7g0008hi9j0k1l2m3n",
        imageName: "custom-name.jpg",
      });

      // Assert: Verify the success message reflects the custom name.
      expect(result.success).toContain("custom-name.jpg");
    });

    /**
     * Verifies that the success message defaults to the database name if none is provided.
     */
    it("uses database name when imageName not provided", async () => {
      // Arrange: Insert an upload with a defined name.
      await insertUpload("clu6f7g8h0009ij0k1l2m3n4o", null, "db-name.jpg");

      // Act: Execute the deletion without passing an optional name.
      const result = await deleteImage({ imageId: "clu6f7g8h0009ij0k1l2m3n4o" });

      // Assert: Verify the success message uses the name from the `uploads` table.
      expect(result.success).toContain("db-name.jpg");
    });

    /**
     * Verifies that a generic fallback name is used if no names are available.
     */
    it("uses generic fallback name when no name provided", async () => {
      // Arrange: Insert an upload with an empty string as the name.
      await insertUpload("clu6f7g8h0009ij0k1l2m3n4x", null, "");

      // Act: Execute the deletion for the unnamed record.
      const result = await deleteImage({ imageId: "clu6f7g8h0009ij0k1l2m3n4x" });

      // Assert: Verify the success message uses the generic "File" fallback.
      expect(result.success).toContain("File successfully deleted");
    });

    /**
     * Verifies that path revalidation occurs when the image is linked to a case.
     */
    it("calls revalidatePath when image belongs to a case", async () => {
      // Arrange: Mock the revalidatePath function.
      const { revalidatePath } = await import("next/cache");

      // Arrange: Create a case with two images to allow deletion of one.
      await insertCase("clv7g8h9i0010jk1l2m3n4o5p");
      await insertUpload("clw8h9i0j0011kl2m3n4o5p6q", "clv7g8h9i0010jk1l2m3n4o5p");
      await insertUpload("clx9i0j1k0012lm3n4o5p6q7r", "clv7g8h9i0010jk1l2m3n4o5p");

      // Act: Execute the deletion of one of the case images.
      await deleteImage({ imageId: "clw8h9i0j0011kl2m3n4o5p6q", imageName: "test.jpg" });

      // Assert: Verify that the results path for the case was revalidated.
      expect(revalidatePath).toHaveBeenCalledWith("/results/clv7g8h9i0010jk1l2m3n4o5p");
    });
  });

  /**
   * Test suite for the logic determining if a case analysis needs recalculation.
   */
  describe("recalculation detection", () => {
    /**
     * Prepares the session and S3 mocks for recalculation tests.
     */
    beforeEach(async () => {
      // Arrange: Configure the mock session for the test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);

      // Arrange: Mock the S3 send method.
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockResolvedValue({} as never);
    });

    /**
     * Verifies that changing the earliest developmental stage triggers a recalculation.
     */
    it("sets recalculationNeeded when oldest stage changes", async () => {
      // Arrange: Setup case, uploads, and detections with an active analysis result.
      await insertCase("cly0j1k2l0013mn4o5p6q7r8s");
      await insertUpload("clz1k2l3m0014no5p6q7r8s9t", "cly0j1k2l0013mn4o5p6q7r8s");
      await insertUpload("cla2l3m4n0015op6q7r8s9t0u", "cly0j1k2l0013mn4o5p6q7r8s");

      // Arrange: Detection to be deleted represents the current calculation stage.
      await insertDetection("clb3m4n5o0016pq7r8s9t0u1v", "clz1k2l3m0014no5p6q7r8s9t", "instar_1");
      await insertDetection("clc4n5o6p0017qr8s9t0u1v2w", "cla2l3m4n0015op6q7r8s9t0u", "pupa");

      // Arrange: Link the analysis results to the initial earliest stage.
      await db.insert(analysisResults).values({
        caseId: "cly0j1k2l0013mn4o5p6q7r8s",
        status: "completed",
        stageUsedForCalculation: "instar_1",
      });

      // Act: Delete the image containing the earliest stage detection.
      await deleteImage({ imageId: "clz1k2l3m0014no5p6q7r8s9t", imageName: "test.jpg" });

      // Assert: Verify the case record has the `recalculationNeeded` flag set to true.
      const caseRecord = await db.query.cases.findFirst({
        where: (cases, { eq }) => eq(cases.id, "cly0j1k2l0013mn4o5p6q7r8s"),
      });
      expect(caseRecord?.recalculationNeeded).toBe(true);
    });

    /**
     * Verifies recalculation flag when only adult detections remain.
     */
    it("handles case when all remaining detections are adults", async () => {
      // Arrange: Setup case and detections where deleting one leaves only adults.
      await insertCase("cld5o6p7q0018rs9t0u1v2w3x");
      await insertUpload("cle6p7q8r0019st0u1v2w3x4y", "cld5o6p7q0018rs9t0u1v2w3x");
      await insertUpload("clf7q8r9s0020tu1v2w3x4y5z", "cld5o6p7q0018rs9t0u1v2w3x");

      await insertDetection("clg8r9s0t0021uv2w3x4y5z6a", "cle6p7q8r0019st0u1v2w3x4y", "instar_1");
      await insertDetection("clh9s0t1u0022vw3x4y5z6a7b", "clf7q8r9s0020tu1v2w3x4y5z", "adult");

      await db.insert(analysisResults).values({
        caseId: "cld5o6p7q0018rs9t0u1v2w3x",
        status: "completed",
        stageUsedForCalculation: "instar_1",
      });

      // Act: Delete the image containing the non-adult stage.
      await deleteImage({ imageId: "cle6p7q8r0019st0u1v2w3x4y", imageName: "test.jpg" });

      // Assert: Verify that a recalculation is requested for the remaining adult detections.
      const caseRecord = await db.query.cases.findFirst({
        where: (cases, { eq }) => eq(cases.id, "cld5o6p7q0018rs9t0u1v2w3x"),
      });
      expect(caseRecord?.recalculationNeeded).toBe(true);
    });

    /**
     * Verifies that recalculation is not requested if the earliest stage remains the same.
     */
    it("does not set recalculationNeeded when stage has not changed", async () => {
      // Arrange: Setup a case where multiple images share the same earliest stage.
      await insertCase("cli0t1u2v0023wx4y5z6a7b8c");
      await insertUpload("clj1u2v3w0024xy5z6a7b8c9d", "cli0t1u2v0023wx4y5z6a7b8c");
      await insertUpload("clk2v3w4x0025yz6a7b8c9d0e", "cli0t1u2v0023wx4y5z6a7b8c");

      await insertDetection("cll3w4x5y0026za7b8c9d0e1f", "clj1u2v3w0024xy5z6a7b8c9d", "pupa");
      await insertDetection("clm4x5y6z0027ab8c9d0e1f2g", "clk2v3w4x0025yz6a7b8c9d0e", "pupa");

      await db.insert(analysisResults).values({
        caseId: "cli0t1u2v0023wx4y5z6a7b8c",
        status: "completed",
        stageUsedForCalculation: "pupa",
      });

      // Act: Delete one image while another image with the same stage remains.
      await deleteImage({ imageId: "clj1u2v3w0024xy5z6a7b8c9d", imageName: "test.jpg" });

      // Assert: Verify the `recalculationNeeded` flag is not set.
      const caseRecord = await db.query.cases.findFirst({
        where: (cases, { eq }) => eq(cases.id, "cli0t1u2v0023wx4y5z6a7b8c"),
      });
      expect(caseRecord?.recalculationNeeded).toBeFalsy();
    });

    /**
     * Verifies stage identification logic across a complex mix of remaining detections.
     */
    it("correctly identifies oldest stage among multiple mixed remaining detections", async () => {
      // Arrange: Setup case with mixed life cycle stages across three images.
      await insertCase("chw6v5u4t3s2r1q0p9o8n7m6");
      await insertUpload("cgv5u4t3s2r1q0p9o8n7m6l5", "chw6v5u4t3s2r1q0p9o8n7m6");
      await insertUpload("cfu4t3s2r1q0p9o8n7m6l5k4", "chw6v5u4t3s2r1q0p9o8n7m6");
      await insertUpload("cet3s2r1q0p9o8n7m6l5k4j3", "chw6v5u4t3s2r1q0p9o8n7m6");

      await insertDetection("dds2r1q0p9o8n7m6l5k4j3i2", "cfu4t3s2r1q0p9o8n7m6l5k4", "instar_3");
      await insertDetection("dcr1q0p9o8n7m6l5k4j3i2h1", "cet3s2r1q0p9o8n7m6l5k4j3", "pupa");

      await db.insert(analysisResults).values({
        caseId: "chw6v5u4t3s2r1q0p9o8n7m6",
        status: "completed",
        stageUsedForCalculation: "adult",
      });

      // Act: Delete an image that doesn't contain the primary detections.
      await deleteImage({ imageId: "cgv5u4t3s2r1q0p9o8n7m6l5", imageName: "test.jpg" });

      // Assert: Verify the case flags for recalculation due to the stage hierarchy shift.
      const caseRecord = await db.query.cases.findFirst({
        where: (cases, { eq }) => eq(cases.id, "chw6v5u4t3s2r1q0p9o8n7m6"),
      });
      expect(caseRecord?.recalculationNeeded).toBe(true);
    });

    /**
     * Verifies that unknown labels are handled using the default hierarchy position.
     */
    it("handles unknown detection label default hierarchy", async () => {
      // Arrange: Setup case with an unrecognized stage label.
      await insertCase("cbq0p9o8n7m6l5k4j3i2h1g0");
      await insertUpload("cap9o8n7m6l5k4j3i2h1g0f9", "cbq0p9o8n7m6l5k4j3i2h1g0");
      await insertUpload("czo8n7m6l5k4j3i2h1g0f9e8", "cbq0p9o8n7m6l5k4j3i2h1g0");

      await insertDetection(
        "dyn7m6l5k4j3i2h1g0f9e8d7",
        "cap9o8n7m6l5k4j3i2h1g0f9",
        "unknown_stage"
      );

      await db.insert(analysisResults).values({
        caseId: "cbq0p9o8n7m6l5k4j3i2h1g0",
        status: "completed",
        stageUsedForCalculation: "instar_1",
      });

      // Act: Delete the empty upload.
      await deleteImage({ imageId: "czo8n7m6l5k4j3i2h1g0f9e8", imageName: "test.jpg" });

      // Assert: Verify recalculation is triggered as unknown stages impact the hierarchy.
      const caseRecord = await db.query.cases.findFirst({
        where: (cases, { eq }) => eq(cases.id, "cbq0p9o8n7m6l5k4j3i2h1g0"),
      });
      expect(caseRecord?.recalculationNeeded).toBe(true);
    });

    /**
     * Verifies recalculation handling during a race condition where no uploads remain.
     */
    it("handles case when no uploads remain (race condition simulation)", async () => {
      // Arrange: Setup case with uploads and completed analysis.
      await insertCase("ckz9y8x7w6v5u4t3s2r1q0p9");
      await insertUpload("cjy8x7w6v5u4t3s2r1q0p9o8", "ckz9y8x7w6v5u4t3s2r1q0p9");
      await insertUpload("cix7w6v5u4t3s2r1q0p9o8n7", "ckz9y8x7w6v5u4t3s2r1q0p9");

      await db.insert(analysisResults).values({
        caseId: "ckz9y8x7w6v5u4t3s2r1q0p9",
        status: "completed",
        stageUsedForCalculation: "instar_1",
      });

      // Arrange: Simulate a condition where database queries return no uploads.
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.uploads, "findMany").mockResolvedValue([]);

      // Act: Attempt to delete an image.
      await deleteImage({ imageId: "cjy8x7w6v5u4t3s2r1q0p9o8", imageName: "test.jpg" });

      // Assert: Verify recalculation is still requested to maintain data integrity.
      const caseRecord = await db.query.cases.findFirst({
        where: (cases, { eq }) => eq(cases.id, "ckz9y8x7w6v5u4t3s2r1q0p9"),
      });
      expect(caseRecord?.recalculationNeeded).toBe(true);
    });
  });

  /**
   * Test suite for checking the robustness of error handling.
   */
  describe("error handling", () => {
    /**
     * Prepares an authenticated session for error handling tests.
     */
    beforeEach(() => {
      // Arrange: Configure the mock session for the test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that S3 communication failures do not crash the action and return a proper error.
     */
    it("handles S3 deletion errors gracefully", async () => {
      // Arrange: Spy on the console to prevent test log pollution.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { s3 } = await import("@/lib/aws");

      // Arrange: Create an upload and force the S3 service to throw an error.
      await insertUpload("cln5y6z7a0028bc9d0e1f2g3h", null, "test.jpg");
      vi.mocked(s3.send).mockRejectedValue(new Error("S3 deletion failed"));

      // Act: Attempt to delete the image while S3 is failing.
      const result = await deleteImage({
        imageId: "cln5y6z7a0028bc9d0e1f2g3h",
        imageName: "test.jpg",
      });

      // Assert: Verify the generic error message is returned to the client.
      expect(result).toEqual({
        error: "An unexpected error occurred while deleting the image.",
      });
      // Assert: Verify that the error was logged for server-side debugging.
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
