import { http, HttpResponse } from "msw";

import { mockCases, mockIds } from "@/__tests__/mocks/fixtures";

// Define the base URL for the application from environment variables or default to localhost.
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Collection of MSW handlers to intercept and mock case-related network requests.
 */
export const casesHandlers = [
  // Intercept POST requests to create a new case record.
  http.post(`${API_URL}/api/cases`, async () => {
    return HttpResponse.json({
      success: true,
      data: mockCases.thirdCase,
    });
  }),

  // Intercept PATCH requests to update an existing case identified by `caseId`.
  http.patch(`${API_URL}/api/cases/:caseId`, async () => {
    return HttpResponse.json({
      success: true,
      message: "Case updated successfully",
    });
  }),

  // Intercept GET requests to retrieve full details for a specific case.
  http.get(`${API_URL}/api/cases/:caseId`, ({ params }) => {
    // Extract the caseId from the request parameters.
    const { caseId } = params;

    // Return the primary mock case if the requested `caseId` matches.
    if (caseId === mockIds.firstCase) {
      return HttpResponse.json({
        success: true,
        data: mockCases.firstCase,
      });
    }

    // Return a 404 error response if the `caseId` is not found in the mock data.
    return HttpResponse.json({ success: false, error: "Case not found" }, { status: 404 });
  }),

  // Intercept GET requests to retrieve only the name of a specific case.
  http.get(`${API_URL}/api/cases/:caseId/name`, ({ params }) => {
    // Extract the caseId from the request parameters.
    const { caseId } = params;

    // Return the name property of the primary mock case if the ID matches.
    if (caseId === mockIds.firstCase) {
      return HttpResponse.json({
        success: true,
        data: { name: mockCases.firstCase.caseName },
      });
    }

    // Return a 404 error response if the `caseId` is not found in the mock data.
    return HttpResponse.json({ success: false, error: "Case not found" }, { status: 404 });
  }),

  // Intercept GET requests to fetch the audit trail or history logs for a specific case.
  http.get(`${API_URL}/api/cases/:caseId/history`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: "ab3qrs4tuv5wx6yz7abc8def",
          action: "case_created",
          userId: mockIds.firstUser,
          timestamp: "2025-01-01T12:00:00.000Z",
          details: { caseName: mockCases.firstCase.caseName },
        },
        {
          id: "cd4stu5vwx6yz7abc8def9gh",
          action: "analysis_completed",
          userId: mockIds.firstUser,
          timestamp: "2025-01-01T12:30:00.000Z",
          details: { totalDetections: 127 },
        },
      ],
    });
  }),
];
