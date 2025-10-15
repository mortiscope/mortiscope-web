import type { MockCondition, MockRow } from "@/__tests__/mocks/database/types";

/**
 * A type representing the in-memory database store, where keys are table names and values are arrays of mock data rows.
 */
type MockStore = Record<string, MockRow[]>;

/**
 * A factory function that creates a mock implementation of the `db.query` interface for account-related tables.
 * @param store An in-memory object that acts as the mock database.
 * @returns A mock query object that mimics the structure and behavior of `drizzle-orm`'s `db.query`.
 */
export const createAccountQueries = (store: MockStore) => ({
  // Mocks the `db.query.accountDeletionTokens` table.
  accountDeletionTokens: {
    /**
     * Simulates the `findFirst` query for the `accountDeletionTokens` table.
     * @param {object} query The query object, containing an optional `where` clause.
     * @returns A promise that resolves to the found row or `undefined`.
     */
    findFirst: async ({ where }: { where: MockCondition }) => {
      const rows = store["account_deletion_tokens"] || [];
      if (where && where.operator === "eq") {
        // Find a row where the token or identifier matches the value in the where clause.
        return rows.find((r) => r.token === where.val || r.identifier === where.val) || undefined;
      }
      // Return the first row if no specific where clause is matched.
      return rows[0] || undefined;
    },
  },
  // Mocks the `db.query.emailChangeTokens` table.
  emailChangeTokens: {
    /**
     * Simulates the `findFirst` query for the `emailChangeTokens` table.
     * @param {object} query The query object, containing an optional `where` clause.
     * @returns A promise that resolves to the found row or `undefined`.
     */
    findFirst: async ({ where }: { where: MockCondition }) => {
      const rows = store["email_change_tokens"] || [];
      if (where && where.operator === "eq") {
        // Find a row where the token, id, or userId matches the value in the where clause.
        return (
          rows.find((r) => r.token === where.val || r.id === where.val || r.userId === where.val) ||
          undefined
        );
      }
      return rows[0] || undefined;
    },
  },
});
