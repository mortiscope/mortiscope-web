import { http, HttpResponse } from "msw";

import {
  mockCases,
  mockDetections,
  mockIds,
  mockUploads,
  mockUsers,
} from "@/__tests__/mocks/fixtures";

// Define the base URL for the application from environment variables or default to localhost.
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Collection of MSW handlers to intercept and mock network requests for analysis results.
 */
export const resultsHandlers = [
  // Intercept GET requests to fetch a summary list of all analysis results.
  http.get(`${API_URL}/api/results`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          ...mockCases.firstCase,
          user: mockUsers.primaryUser,
          _count: { uploads: 2 },
          totalDetections: 127,
          verifiedDetections: 45,
        },
        {
          ...mockCases.secondCase,
          user: mockUsers.primaryUser,
          _count: { uploads: 3 },
          totalDetections: 89,
          verifiedDetections: 89,
        },
      ],
    });
  }),

  // Intercept GET requests to retrieve detailed results for a specific case including uploads and detections.
  http.get(`${API_URL}/api/results/:caseId`, ({ params }) => {
    // Extract the caseId from the request parameters.
    const { caseId } = params;

    // Return extended mock data if the requested `caseId` matches the primary mock case identifier.
    if (caseId === mockIds.firstCase) {
      return HttpResponse.json({
        success: true,
        data: {
          ...mockCases.firstCase,
          user: mockUsers.primaryUser,
          uploads: [
            {
              ...mockUploads.firstUpload,
              detections: [
                mockDetections.adultDetection,
                mockDetections.secondInstarDetection,
                mockDetections.thirdInstarDetection,
              ],
            },
            {
              ...mockUploads.secondUpload,
              detections: [mockDetections.pupaDetection],
            },
          ],
        },
      });
    }

    // Return a 404 error response if the provided `caseId` does not exist.
    return HttpResponse.json({ success: false, error: "Case not found" }, { status: 404 });
  }),

  // Intercept DELETE requests to remove a specific analysis case result.
  http.delete(`${API_URL}/api/results/:caseId`, () => {
    return HttpResponse.json({
      success: true,
      message: "Case deleted successfully",
    });
  }),

  // Intercept PATCH requests to update the name of a specific analysis case.
  http.patch(`${API_URL}/api/results/:caseId/name`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Case renamed successfully",
    });
  }),

  // Intercept GET requests to check the current completion status and progress of an analysis case.
  http.get(`${API_URL}/api/results/:caseId/analysis-status`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        status: "completed",
        progress: 100,
        totalDetections: 127,
      },
    });
  }),

  // Intercept GET requests to determine if a result requires data recalculation based on updates.
  http.get(`${API_URL}/api/results/:caseId/recalculation-status`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        needed: false,
        status: "idle",
      },
    });
  }),

  // Intercept POST requests to trigger a manual recalculation of analysis metrics for a case.
  http.post(`${API_URL}/api/results/:caseId/recalculate`, () => {
    return HttpResponse.json({
      success: true,
      message: "Recalculation started",
    });
  }),
];
