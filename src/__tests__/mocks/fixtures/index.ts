/**
 * Central export hub for all mock data fixtures used throughout the test suite.
 */

// Exports status objects representing the lifecycle of an analysis task.
export { mockAnalysisStatus } from "@/__tests__/mocks/fixtures/analysis.fixtures";

// Exports credentials and two-factor authentication data for security testing.
export { mockAuthCredentials, mockTwoFactorAuth } from "@/__tests__/mocks/fixtures/auth.fixtures";

// Exports mock case entities including metadata and status flags.
export { mockCases } from "@/__tests__/mocks/fixtures/cases.fixtures";

// Exports aggregated statistical data for dashboard visualization testing.
export { mockDashboardMetrics } from "@/__tests__/mocks/fixtures/dashboard.fixtures";

// Exports standardized ISO date strings for temporal consistency in tests.
export { mockDates } from "@/__tests__/mocks/fixtures/dates.fixtures";

// Exports detection objects containing bounding boxes and classification labels.
export { mockDetections } from "@/__tests__/mocks/fixtures/detections.fixtures";

// Exports record objects for generated reports and data exports.
export { mockExports } from "@/__tests__/mocks/fixtures/exports.fixtures";

// Exports a centralized collection of unique identifier strings to maintain referential integrity.
export { mockIds } from "@/__tests__/mocks/fixtures/ids.fixtures";

// Exports geographic and administrative division data for location-based fields.
export { mockLocations } from "@/__tests__/mocks/fixtures/locations.fixtures";

// Exports session tokens and user agent metadata for authentication persistence testing.
export { mockSessions } from "@/__tests__/mocks/fixtures/sessions.fixtures";

// Exports metadata and cloud storage references for uploaded image files.
export { mockUploads } from "@/__tests__/mocks/fixtures/uploads.fixtures";

// Exports user profile data including contact information and institutional affiliations.
export { mockUsers } from "@/__tests__/mocks/fixtures/users.fixtures";
