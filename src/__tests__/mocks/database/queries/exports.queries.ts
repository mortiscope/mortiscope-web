import type { MockCondition, MockRow } from "@/__tests__/mocks/database/types";
import { matchesCondition } from "@/__tests__/mocks/database/utils";

/**
 * A type representing the in-memory database store, where keys are table names and values are arrays of mock data rows.
 */
type MockStore = Record<string, MockRow[]>;

/**
 * A factory function that creates a mock implementation of the `db.query` interface for the `exports` table.
 * @param store An in-memory object that acts as the mock database.
 * @returns A mock query object that mimics the structure and behavior of `drizzle-orm`'s `db.query`.
 */
export const createExportsQueries = (store: MockStore) => ({
  // Mocks the `db.query.exports` table.
  exports: {
    /**
     * Simulates the `findFirst` query for the `exports` table.
     * @param {object} query The query object, containing optional `where` and `columns` clauses.
     * @returns A promise that resolves to the found row (potentially with selected columns) or `undefined`.
     */
    findFirst: async ({
      where,
      columns,
    }: {
      where?: MockCondition;
      columns?: Record<string, boolean>;
    }) => {
      let rows = store["exports"] || [];
      // Apply the `where` clause to filter the initial set of rows.
      if (where) {
        if (where.operator === "and" && where.conditions) {
          rows = rows.filter((row) => where.conditions!.every((c) => matchesCondition(row, c)));
        } else {
          rows = rows.filter((row) => matchesCondition(row, where));
        }
      }

      // Get the first matching result.
      const result = rows[0];
      if (!result) return undefined;

      // If a `columns` object is provided, simulate column selection by returning an object with just the requested fields.
      if (columns) {
        const filtered: Record<string, unknown> = {};
        for (const [key, include] of Object.entries(columns)) {
          if (include && key in result) {
            filtered[key] = result[key];
          }
        }
        return filtered;
      }

      // If no `columns` are specified, return the full row object.
      return result;
    },
    /**
     * Simulates the `findMany` query for the `exports` table.
     * @param {object} query The query object, containing an optional `where` clause.
     * @returns A promise that resolves to an array of found row objects.
     */
    findMany: async ({ where }: { where?: MockCondition }) => {
      let rows = store["exports"] || [];
      if (where) {
        if (where.operator === "and" && where.conditions) {
          rows = rows.filter((row) => where.conditions!.every((c) => matchesCondition(row, c)));
        } else {
          rows = rows.filter((row) => matchesCondition(row, where));
        }
      }
      return rows;
    },
  },
});
