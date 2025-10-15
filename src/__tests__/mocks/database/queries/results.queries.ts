import type { MockCondition, MockRow } from "@/__tests__/mocks/database/types";
import { getColName, getValue, matchesCondition } from "@/__tests__/mocks/database/utils";

/**
 * A type representing the in-memory database store, where keys are table names and values are arrays of mock data rows.
 */
type MockStore = Record<string, MockRow[]>;

/**
 * A factory function that creates a mock implementation of the `db.query` interface for results-related tables.
 * @param store An in-memory object that acts as the mock database.
 * @returns A mock query object that mimics the structure and behavior of `drizzle-orm`'s `db.query`.
 */
export const createResultsQueries = (store: MockStore) => ({
  // Mocks the `db.query.uploads` table.
  uploads: {
    /**
     * Simulates the `findFirst` query for the `uploads` table.
     * @returns A promise that resolves to the first found and populated upload object, or `undefined`.
     */
    findFirst: async ({
      where,
      with: withRelations,
    }: {
      where?: MockCondition;
      with?: { detections: boolean };
    }) => {
      let result = store["uploads"] || [];

      // Apply the `where` clause to filter the initial set of rows.
      if (where) {
        if (where.operator === "and" && where.conditions) {
          result = result.filter((row) => where.conditions!.every((c) => matchesCondition(row, c)));
        } else {
          result = result.filter((row) => matchesCondition(row, where));
        }
      }

      const upload = result[0];

      // If the `detections` relation is requested, find and nest the corresponding detections.
      if (upload && withRelations?.detections) {
        const detections = store["detections"] || [];
        return {
          ...upload,
          detections: detections.filter((d) => d.uploadId === upload.id),
        };
      }

      return upload || undefined;
    },
    /**
     * Simulates the `findMany` query for the `uploads` table.
     * @returns A promise that resolves to an array of found upload objects.
     */
    findMany: async ({
      where,
      orderBy,
    }: {
      where?: MockCondition;
      orderBy?: (rows: MockRow, helpers: { desc: (col: unknown) => unknown }) => unknown[];
    }) => {
      let result = store["uploads"] || [];

      if (where) {
        if (where.operator === "and" && where.conditions) {
          result = result.filter((row) => where.conditions!.every((c) => matchesCondition(row, c)));
        } else {
          result = result.filter((row) => matchesCondition(row, where));
        }
      }

      // Apply a simplified `orderBy` clause (descending by date).
      if (orderBy && result.length > 0) {
        const sortOps = Array.isArray(orderBy) ? orderBy : [orderBy];
        const firstOp = sortOps[0] as unknown as { operator: string; col: unknown };

        if (firstOp && firstOp.operator === "desc") {
          const colName = getColName(firstOp.col);
          result.sort((a, b) => {
            const va = getValue(a, colName);
            const vb = getValue(b, colName);
            // Assumes date-based sorting for this mock.
            return new Date(vb as string).getTime() - new Date(va as string).getTime();
          });
        }
      }
      return result;
    },
  },
  // Mocks the `db.query.analysisResults` table.
  analysisResults: {
    /**
     * Simulates the `findFirst` query for the `analysis_results` table.
     * @returns A promise that resolves to the found row or `null`.
     */
    findFirst: async ({ where }: { where: MockCondition }) => {
      const rows = store["analysis_results"] || [];
      if (where && where.operator === "eq") {
        return rows.find((r) => r.id === where.val || r.caseId === where.val) || null;
      }
      return rows[0] || null;
    },
  },
  // Mocks the `db.query.detections` table.
  detections: {
    /**
     * Simulates the `findMany` query for the `detections` table.
     * @returns A promise that resolves to an array of found detection objects.
     */
    findMany: async ({ where }: { where?: MockCondition }) => {
      let result = store["detections"] || [];
      if (where) {
        if (where.operator === "and" && where.conditions) {
          result = result.filter((row) => where.conditions!.every((c) => matchesCondition(row, c)));
        } else {
          result = result.filter((row) => matchesCondition(row, where));
        }
      }
      return result;
    },
    /**
     * Simulates the `findFirst` query for the `detections` table.
     * @returns A promise that resolves to the first found detection object, or `undefined`.
     */
    findFirst: async ({ where }: { where: MockCondition }) => {
      let result = store["detections"] || [];
      if (where) {
        if (where.operator === "and" && where.conditions) {
          result = result.filter((row) => where.conditions!.every((c) => matchesCondition(row, c)));
        } else {
          result = result.filter((row) => matchesCondition(row, where));
        }
      }
      return result[0] || undefined;
    },
  },
});
