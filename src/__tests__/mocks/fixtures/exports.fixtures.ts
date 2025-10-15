import { mockDates } from "@/__tests__/mocks/fixtures/dates.fixtures";
import { mockIds } from "@/__tests__/mocks/fixtures/ids.fixtures";

/**
 * Constant containing mock export record objects to simulate the generation of downloadable reports.
 */
export const mockExports = {
  // Representation of a generated PDF report stored in a cloud storage bucket.
  pdfExport: {
    id: mockIds.firstExport,
    caseId: mockIds.firstCase,
    userId: mockIds.firstUser,
    type: "pdf" as const,
    status: "completed" as const,
    url: `https://mortiscope-test.s3.ap-southeast-1.amazonaws.com/exports/${mockIds.firstCase}/report.pdf`,
    createdAt: new Date(mockDates.created),
    completedAt: new Date(mockDates.updated),
  },
  // Representation of a generated CSV data file containing case-specific detection metrics.
  csvExport: {
    id: mockIds.secondExport,
    caseId: mockIds.firstCase,
    userId: mockIds.firstUser,
    type: "csv" as const,
    status: "completed" as const,
    url: `https://mortiscope-test.s3.ap-southeast-1.amazonaws.com/exports/${mockIds.firstCase}/data.csv`,
    createdAt: new Date(mockDates.created),
    completedAt: new Date(mockDates.updated),
  },
};
