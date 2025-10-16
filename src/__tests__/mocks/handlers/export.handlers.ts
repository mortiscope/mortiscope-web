import { http, HttpResponse } from "msw";

import { mockExports, mockIds } from "@/__tests__/mocks/fixtures";

// Define the base URL for the application from environment variables or default to localhost.
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Collection of MSW handlers to intercept and mock export-related network requests.
 */
export const exportHandlers = [
  // Intercept POST requests to initiate the export of analysis results data.
  http.post(`${API_URL}/api/exports/results`, async () => {
    return HttpResponse.json({
      success: true,
      data: {
        exportId: mockIds.firstExport,
        status: "processing",
      },
    });
  }),

  // Intercept POST requests to initiate the export of processed images.
  http.post(`${API_URL}/api/exports/images`, async () => {
    return HttpResponse.json({
      success: true,
      data: {
        exportId: mockIds.firstExport,
        status: "processing",
      },
    });
  }),

  // Intercept GET requests to check the current progress or status of a specific export task.
  http.get(`${API_URL}/api/exports/:exportId/status`, ({ params }) => {
    // Extract the exportId from the request parameters.
    const { exportId } = params;

    // Return the completed export mock data if the requested `exportId` matches.
    if (exportId === mockIds.firstExport) {
      return HttpResponse.json({
        success: true,
        data: {
          ...mockExports.pdfExport,
          status: "completed",
        },
      });
    }

    // Return a 404 error response if the `exportId` is not found in the mock data.
    return HttpResponse.json({ success: false, error: "Export not found" }, { status: 404 });
  }),

  // Intercept GET requests to retrieve a list of the user's most recent export tasks.
  http.get(`${API_URL}/api/exports/recent`, () => {
    return HttpResponse.json({
      success: true,
      data: [mockExports.pdfExport],
    });
  }),
];
