import { http, HttpResponse } from "msw";

import { mockIds, mockUploads } from "@/__tests__/mocks/fixtures";

// Define the base URL for the application from environment variables or default to localhost.
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Collection of MSW handlers to intercept and mock image and file upload network requests.
 */
export const uploadHandlers = [
  // Intercept POST requests to initialize a new file upload and receive a presigned S3 URL.
  http.post(`${API_URL}/api/uploads`, async () => {
    return HttpResponse.json({
      success: true,
      data: {
        uploadId: mockIds.firstUpload,
        presignedUrl: "https://mortiscope-test.s3.amazonaws.com/presigned-upload-url",
        key: mockUploads.firstUpload.key,
      },
    });
  }),

  // Intercept PATCH requests to update specific metadata for an existing upload record.
  http.patch(`${API_URL}/api/uploads/:uploadId`, async () => {
    return HttpResponse.json({
      success: true,
      data: mockUploads.firstUpload,
    });
  }),

  // Intercept PUT requests to replace or fully update an upload record identified by `uploadId`.
  http.put(`${API_URL}/api/uploads/:uploadId`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Upload updated successfully",
    });
  }),

  // Intercept DELETE requests to remove an upload record and its associated data.
  http.delete(`${API_URL}/api/uploads/:uploadId`, () => {
    return HttpResponse.json({
      success: true,
      message: "Upload deleted successfully",
    });
  }),

  // Intercept PATCH requests to specifically rename the filename of a given upload.
  http.patch(`${API_URL}/api/uploads/:uploadId/name`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Upload renamed successfully",
    });
  }),

  // Intercept GET requests to retrieve detailed information for a specific upload.
  http.get(`${API_URL}/api/uploads/:uploadId`, ({ params }) => {
    // Extract the uploadId from the request parameters.
    const { uploadId } = params;

    // Return the primary mock upload data if the requested `uploadId` matches the mock ID.
    if (uploadId === mockIds.firstUpload) {
      return HttpResponse.json({
        success: true,
        data: mockUploads.firstUpload,
      });
    }

    // Return a 404 error response if the requested upload record does not exist.
    return HttpResponse.json({ success: false, error: "Upload not found" }, { status: 404 });
  }),
];
