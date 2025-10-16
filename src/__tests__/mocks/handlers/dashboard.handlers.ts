import { http, HttpResponse } from "msw";

import { mockDashboardMetrics } from "@/__tests__/mocks/fixtures";

// Define the base URL for the application from environment variables or default to localhost.
const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Collection of MSW handlers to intercept and mock dashboard and metrics-related network requests.
 */
export const dashboardHandlers = [
  // Intercept GET requests to fetch high-level dashboard metrics and summary data.
  http.get(`${API_URL}/api/dashboard/metrics`, () => {
    return HttpResponse.json({
      success: true,
      data: mockDashboardMetrics,
    });
  }),

  // Intercept GET requests to retrieve the statistical distribution of model confidence scores.
  http.get(`${API_URL}/api/dashboard/confidence-distribution`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        ranges: [
          { range: "0.5-0.6", count: 45 },
          { range: "0.6-0.7", count: 156 },
          { range: "0.7-0.8", count: 412 },
          { range: "0.8-0.9", count: 523 },
          { range: "0.9-1.0", count: 111 },
        ],
        averageConfidence: 0.78,
      },
    });
  }),

  // Intercept GET requests to fetch the distribution of identified insect life stages.
  http.get(`${API_URL}/api/dashboard/life-stage-distribution`, () => {
    return HttpResponse.json({
      success: true,
      data: mockDashboardMetrics.lifeStageDistribution,
    });
  }),

  // Intercept GET requests to retrieve Post-Mortem Interval (PMI) estimation distributions.
  http.get(`${API_URL}/api/dashboard/pmi-distribution`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        ranges: [
          { range: "0-24h", count: 5 },
          { range: "24-48h", count: 8 },
          { range: "48-72h", count: 12 },
          { range: "72-96h", count: 7 },
          { range: "96h+", count: 3 },
        ],
      },
    });
  }),

  // Intercept GET requests to fetch density data regarding sampling across different regions.
  http.get(`${API_URL}/api/dashboard/sampling-density`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        regions: [
          { region: "Region 1", count: 25 },
          { region: "Region 2", count: 18 },
          { region: "Region 3", count: 12 },
          { region: "Region 4", count: 8 },
        ],
      },
    });
  }),

  // Intercept GET requests to retrieve the ratio of verified versus unverified detections.
  http.get(`${API_URL}/api/dashboard/verification-status`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        verified: 856,
        unverified: 391,
        total: 1247,
        percentage: 68.6,
      },
    });
  }),

  // Intercept GET requests to track manual user corrections versus automated model output.
  http.get(`${API_URL}/api/dashboard/user-corrections`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        modelGenerated: 1150,
        userModified: 72,
        userCreated: 25,
        correctionRatio: 0.084,
      },
    });
  }),

  // Intercept GET requests to fetch model performance evaluations like precision and recall.
  http.get(`${API_URL}/api/dashboard/model-performance`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        accuracy: 0.92,
        precision: 0.89,
        recall: 0.94,
        f1Score: 0.91,
      },
    });
  }),

  // Intercept GET requests to retrieve a summary of case statuses and recent creation activity.
  http.get(`${API_URL}/api/dashboard/case-data`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalCases: 35,
        activeCases: 28,
        completedCases: 7,
        recentActivity: [
          { date: "2025-01-01", cases: 3 },
          { date: "2025-01-02", cases: 5 },
          { date: "2025-01-03", cases: 2 },
        ],
      },
    });
  }),

  // Intercept POST requests to perform bulk deletion of cases using a list of IDs.
  http.post(`${API_URL}/api/dashboard/delete-cases`, async ({ request }) => {
    // Extract the array of case identifiers from the request body.
    const body = (await request.json()) as { caseIds: string[] };

    return HttpResponse.json({
      success: true,
      message: `${body.caseIds.length} case(s) deleted successfully`,
      deletedIds: body.caseIds,
    });
  }),
];
