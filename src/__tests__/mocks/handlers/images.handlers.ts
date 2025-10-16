import { http, HttpResponse } from "msw";

import { mockIds, mockUploads } from "@/__tests__/mocks/fixtures";

// Define the base URL for the application from environment variables or default to localhost.
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Collection of MSW handlers to intercept and mock image management network requests.
 */
export const imagesHandlers = [
  // Intercept DELETE requests to remove a specific image file identified by `uploadId`.
  http.delete(`${API_URL}/api/images/:uploadId`, ({ params }) => {
    // Extract the uploadId from the request parameters.
    const { uploadId } = params;

    // Check if the provided `uploadId` matches either of the primary mock upload identifiers.
    if (uploadId === mockIds.firstUpload || uploadId === mockIds.secondUpload) {
      return HttpResponse.json({
        success: true,
        message: "Image deleted successfully",
      });
    }

    // Return a 404 error response if the `uploadId` is not recognized.
    return HttpResponse.json({ success: false, error: "Image not found" }, { status: 404 });
  }),

  // Intercept PATCH requests to update the display name of a specific image.
  http.patch(`${API_URL}/api/images/:uploadId/name`, async ({ params }) => {
    // Extract the uploadId from the request parameters.
    const { uploadId } = params;

    // Verify if the requested `uploadId` corresponds to the first mock upload record.
    if (uploadId === mockIds.firstUpload) {
      return HttpResponse.json({
        success: true,
        message: "Image renamed successfully",
        data: {
          ...mockUploads.firstUpload,
          name: "Renamed_Image.jpg",
        },
      });
    }

    // Return a 404 error response if the image metadata cannot be updated due to a missing record.
    return HttpResponse.json({ success: false, error: "Image not found" }, { status: 404 });
  }),
];
