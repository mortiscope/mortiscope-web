import { http, HttpResponse } from "msw";

import { mockAnalysisStatus, mockCases, mockIds, mockUploads } from "@/__tests__/mocks/fixtures";

// Define the base URL for the application from environment variables or default to localhost.
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Collection of MSW handlers to intercept and mock analysis-related network requests.
 */
export const analyzeHandlers = [
  // Intercept GET requests to retrieve the current draft analysis case.
  http.get(`${API_URL}/api/analyze/draft`, () => {
    return HttpResponse.json({
      success: true,
      data: mockCases.thirdCase,
    });
  }),

  // Intercept GET requests to fetch all uploaded files associated with a specific `caseId`.
  http.get(`${API_URL}/api/analyze/:caseId/uploads`, () => {
    return HttpResponse.json({
      success: true,
      data: [mockUploads.firstUpload, mockUploads.secondUpload],
    });
  }),

  // Intercept GET requests to retrieve metadata for a specific upload identified by `uploadId`.
  http.get(`${API_URL}/api/analyze/uploads/:uploadId`, ({ params }) => {
    const { uploadId } = params;

    // Return the mock upload data if the requested `uploadId` matches the primary mock ID.
    if (uploadId === mockIds.firstUpload) {
      return HttpResponse.json({
        success: true,
        data: mockUploads.firstUpload,
      });
    }

    // Return a 404 error response if the `uploadId` does not exist in the mock data.
    return HttpResponse.json({ success: false, error: "Upload not found" }, { status: 404 });
  }),

  // Intercept POST requests to trigger the submission and start the analysis process for a case.
  http.post(`${API_URL}/api/analyze/:caseId/submit`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Analysis started",
      data: {
        caseId: mockIds.firstCase,
        status: "processing",
      },
    });
  }),

  // Intercept POST requests to cancel an ongoing analysis process for a specific case.
  http.post(`${API_URL}/api/analyze/:caseId/cancel`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Analysis cancelled",
    });
  }),

  // Intercept GET requests to poll or check the current progress of an analysis identified by `caseId`.
  http.get(`${API_URL}/api/analyze/:caseId/status`, ({ params }) => {
    const { caseId } = params;

    // Return a completed status object if the `caseId` matches the primary mock case.
    if (caseId === mockIds.firstCase) {
      return HttpResponse.json({
        success: true,
        data: mockAnalysisStatus.completed,
      });
    }

    // Return a processing status object if the `caseId` matches the secondary mock case.
    if (caseId === mockIds.secondCase) {
      return HttpResponse.json({
        success: true,
        data: mockAnalysisStatus.processing,
      });
    }

    // Default to a pending status object for any other provided `caseId`.
    return HttpResponse.json({
      success: true,
      data: mockAnalysisStatus.pending,
    });
  }),
];
