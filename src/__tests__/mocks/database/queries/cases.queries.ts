import type { MockCondition, MockRow } from "@/__tests__/mocks/database/types";
import { getColName, getValue, matchesCondition } from "@/__tests__/mocks/database/utils";

/**
 * A type representing the in-memory database store, where keys are table names and values are arrays of mock data rows.
 */
type MockStore = Record<string, MockRow[]>;

/**
 * A factory function that creates a mock implementation of the `db.query` interface for case-related tables.
 * @param store An in-memory object that acts as the mock database.
 * @returns A mock query object that mimics the structure and behavior of `drizzle-orm`'s `db.query`.
 */
export const createCasesQueries = (store: MockStore) => ({
  // Mocks the `db.query.cases` table.
  cases: {
    /**
     * Simulates the `findMany` query for the `cases` table.
     * @returns A promise that resolves to an array of found and populated case objects.
     */
    findMany: async ({
      where,
      orderBy,
      with: withRelations,
    }: {
      where?: MockCondition;
      orderBy?: unknown[];
      with?: {
        uploads?: { with?: { detections?: { columns?: unknown } } };
        analysisResult?: boolean;
      };
    }) => {
      let rows = store["cases"] || [];
      // Apply the `where` clause to filter the initial set of rows.
      if (where) {
        if (where.operator === "and" && where.conditions) {
          rows = rows.filter((row) => where.conditions!.every((c) => matchesCondition(row, c)));
        } else {
          rows = rows.filter((row) => matchesCondition(row, where));
        }
      }

      // Apply a simplified `orderBy` clause (descending by date).
      if (orderBy && rows.length > 0) {
        const sortOps = Array.isArray(orderBy) ? orderBy : [orderBy];
        const firstOp = sortOps[0] as unknown as { operator: string; col: unknown };

        if (firstOp && firstOp.operator === "desc") {
          const colName = getColName(firstOp.col);
          rows.sort((a, b) => {
            const va = getValue(a, colName);
            const vb = getValue(b, colName);
            // Assumes date-based sorting for this mock.
            return new Date(vb as string).getTime() - new Date(va as string).getTime();
          });
        }
      }

      // Process relational data (`with` clause).
      const result = rows.map((caseItem) => {
        const item = { ...caseItem };

        if (withRelations?.uploads) {
          const uploads = (store["uploads"] || []).filter((u) => u.caseId === item.id);

          if (withRelations.uploads.with?.detections) {
            // If `detections` are also requested, fetch and nest them.
            item.uploads = uploads.map((upload) => {
              const up = { ...upload };
              let detections = (store["detections"] || []).filter((d) => d.uploadId === up.id);
              // Also filter out any soft-deleted detections.
              detections = detections.filter(
                (d) => d.deletedAt === null || d.deletedAt === undefined
              );
              up.detections = detections;
              return up;
            });
          } else {
            item.uploads = uploads;
          }
        }

        if (withRelations?.analysisResult) {
          item.analysisResult =
            (store["analysis_results"] || []).find((r) => r.caseId === item.id) || null;
        }

        return item;
      });

      return result;
    },
    /**
     * Simulates the `findFirst` query for the `cases` table.
     * @returns A promise that resolves to the first found and populated case object, or `undefined`.
     */
    findFirst: async ({
      where,
      orderBy,
      with: withRelations,
    }: {
      where: MockCondition;
      orderBy?: unknown[];
      with?: {
        uploads?: { with?: { detections?: boolean } };
        analysisResult?: boolean;
      };
    }) => {
      let rows = store["cases"] || [];
      if (where) {
        if (where.operator === "and" && where.conditions) {
          rows = rows.filter((row) => where.conditions!.every((c) => matchesCondition(row, c)));
        } else {
          rows = rows.filter((row) => matchesCondition(row, where));
        }
      }

      if (orderBy && rows.length > 0) {
        const sortOps = Array.isArray(orderBy) ? orderBy : [orderBy];
        const firstOp = sortOps[0] as unknown as { operator: string; col: unknown };

        if (firstOp && firstOp.operator === "desc") {
          const colName = getColName(firstOp.col);
          rows.sort((a, b) => {
            const va = getValue(a, colName);
            const vb = getValue(b, colName);
            return new Date(vb as string).getTime() - new Date(va as string).getTime();
          });
        }
      }

      const caseItem = rows[0];
      if (!caseItem) return undefined;

      const item = { ...caseItem };

      if (withRelations?.uploads) {
        const uploads = (store["uploads"] || []).filter((u) => u.caseId === item.id);

        if (withRelations.uploads.with?.detections) {
          item.uploads = uploads.map((upload) => {
            const up = { ...upload };
            const detections = (store["detections"] || []).filter((d) => d.uploadId === up.id);
            up.detections = detections;
            return up;
          });
        } else {
          item.uploads = uploads;
        }
      }

      if (withRelations?.analysisResult) {
        item.analysisResult =
          (store["analysis_results"] || []).find((r) => r.caseId === item.id) || null;
      }

      return item;
    },
  },
  // Mocks the `db.query.caseAuditLogs` table.
  caseAuditLogs: {
    /**
     * Simulates the `findMany` query for the `case_audit_logs` table.
     * @returns A promise that resolves to an array of found and populated log objects.
     */
    findMany: async ({
      where,
      orderBy,
      with: withRelations,
    }: {
      where?: MockCondition;
      orderBy?: unknown[];
      with?: { user?: { columns?: { name?: boolean; image?: boolean } } };
    }) => {
      let rows = store["case_audit_logs"] || [];

      if (where) {
        if (where.operator === "and" && where.conditions) {
          rows = rows.filter((row) => where.conditions!.every((c) => matchesCondition(row, c)));
        } else {
          rows = rows.filter((row) => matchesCondition(row, where));
        }
      }

      if (orderBy && rows.length > 0) {
        const sortOps = Array.isArray(orderBy) ? orderBy : [orderBy];
        const firstOp = sortOps[0] as unknown as { operator: string; col: unknown };

        if (firstOp && firstOp.operator === "desc") {
          const colName = getColName(firstOp.col);
          rows.sort((a, b) => {
            const va = getValue(a, colName);
            const vb = getValue(b, colName);
            return new Date(vb as string).getTime() - new Date(va as string).getTime();
          });
        }
      }

      // If the `user` relation is requested, find the matching user and nest their details.
      if (withRelations?.user) {
        const users = store["users"] || [];
        rows = rows.map((log) => {
          const user = users.find((u) => u.id === log.userId);
          return {
            ...log,
            user: user ? { name: user.name, image: user.image ?? null } : null,
          };
        });
      }

      return rows;
    },
  },
});
