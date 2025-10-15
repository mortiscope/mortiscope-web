import { mockIds } from "@/__tests__/mocks/fixtures/ids.fixtures";

/**
 * Constant containing mock analysis status objects for different stages of the analysis lifecycle.
 */
export const mockAnalysisStatus = {
  // Representation of an analysis that has been initiated but not yet processed.
  pending: {
    caseId: mockIds.firstCase,
    status: "pending" as const,
    progress: 0,
    message: "Initializing analysis...",
  },
  // Representation of an analysis currently being processed with partial progress.
  processing: {
    caseId: mockIds.firstCase,
    status: "processing" as const,
    progress: 45,
    message: "Running analysis on the backend...",
  },
  // Representation of a successfully finished analysis including total detection counts.
  completed: {
    caseId: mockIds.firstCase,
    status: "completed" as const,
    progress: 100,
    message: "Analysis complete.",
    totalDetections: 127,
  },
  // Representation of an analysis that terminated due to a server-side error.
  failed: {
    caseId: mockIds.firstCase,
    status: "failed" as const,
    progress: 0,
    message: "Analysis failed.",
    error: "INFERENCE_SERVER_UNAVAILABLE",
  },
};
