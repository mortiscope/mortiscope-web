import { http, HttpResponse } from "msw";

import { mockDetections, mockIds, mockUploads } from "@/__tests__/mocks/fixtures";

// Define the base URL for the application from environment variables or default to localhost.
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Collection of MSW handlers to intercept and mock annotation and editor-related network requests.
 */
export const annotationHandlers = [
  // Intercept GET requests to retrieve image data and existing detections for the editor.
  http.get(`${API_URL}/api/editor/:uploadId`, ({ params }) => {
    // Extract the uploadId from the request parameters.
    const { uploadId } = params;

    // Return mock upload data and a collection of insect stage detections if the ID matches.
    if (uploadId === mockIds.firstUpload) {
      return HttpResponse.json({
        success: true,
        data: {
          upload: mockUploads.firstUpload,
          detections: [
            mockDetections.adultDetection,
            mockDetections.secondInstarDetection,
            mockDetections.thirdInstarDetection,
            mockDetections.pupaDetection,
          ],
        },
      });
    }

    // Return a 404 error response if the provided `uploadId` does not match the mock data.
    return HttpResponse.json({ success: false, error: "Image not found" }, { status: 404 });
  }),

  // Intercept POST requests to save or synchronize detection data from the editor.
  http.post(`${API_URL}/api/editor/:uploadId/detections`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Detections saved successfully",
      data: {
        created: 1,
        updated: 2,
        deleted: 0,
        verified: 3,
      },
    });
  }),
];
