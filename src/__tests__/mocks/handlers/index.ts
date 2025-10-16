import { accountHandlers } from "@/__tests__/mocks/handlers/account.handlers";
import { analyzeHandlers } from "@/__tests__/mocks/handlers/analyze.handlers";
import { annotationHandlers } from "@/__tests__/mocks/handlers/annotation.handlers";
import { authHandlers } from "@/__tests__/mocks/handlers/auth.handlers";
import { casesHandlers } from "@/__tests__/mocks/handlers/cases.handlers";
import { dashboardHandlers } from "@/__tests__/mocks/handlers/dashboard.handlers";
import { exportHandlers } from "@/__tests__/mocks/handlers/export.handlers";
import { imagesHandlers } from "@/__tests__/mocks/handlers/images.handlers";
import { resultsHandlers } from "@/__tests__/mocks/handlers/results.handlers";
import { uploadHandlers } from "@/__tests__/mocks/handlers/upload.handlers";

/**
 * Aggregates all domain-specific MSW handlers into a single array for server initialization.
 */
export const handlers = [
  // Handlers for user profile, security, and session management endpoints.
  ...accountHandlers,
  // Handlers for initiating and monitoring the status of case analyses.
  ...analyzeHandlers,
  // Handlers for managing image annotations and object detections in the editor.
  ...annotationHandlers,
  // Handlers for authentication flows including login, signup, and password recovery.
  ...authHandlers,
  // Handlers for basic CRUD operations and history tracking on case records.
  ...casesHandlers,
  // Handlers for dashboard metrics, statistical distributions, and performance data.
  ...dashboardHandlers,
  // Handlers for background tasks related to exporting results and images.
  ...exportHandlers,
  // Handlers for file-level image operations such as renaming or individual deletion.
  ...imagesHandlers,
  // Handlers for fetching, recalculating, and managing finalized analysis results.
  ...resultsHandlers,
  // Handlers for file upload orchestration and S3 presigned URL generation.
  ...uploadHandlers,
];
