import type { MockCondition, MockRow } from "@/__tests__/mocks/database/types";
import { getColName, getValue } from "@/__tests__/mocks/database/utils";

/**
 * A type representing the in-memory database store, where keys are table names and values are arrays of mock data rows.
 */
type MockStore = Record<string, MockRow[]>;

/**
 * A factory function that creates a mock implementation of the `db.query` interface for authentication-related tables.
 * @param store An in-memory object that acts as the mock database.
 * @returns A mock query object that mimics the structure and behavior of `drizzle-orm`'s `db.query`.
 */
export const createAuthQueries = (store: MockStore) => ({
  // Mocks the `db.query.users` table.
  users: {
    /**
     * Simulates the `findFirst` query for the `users` table.
     * @returns A promise that resolves to the found row or `null`.
     */
    findFirst: async ({ where }: { where: MockCondition }) => {
      const rows = store["users"] || [];
      if (where && where.operator === "eq") {
        return rows.find((r) => r.id === where.val || r.email === where.val) || null;
      }
      return rows[0] || null;
    },
  },
  // Mocks the `db.query.userTwoFactor` table.
  userTwoFactor: {
    /**
     * Simulates the `findFirst` query for the `user_two_factor` table.
     * @returns A promise that resolves to the found row or `null`.
     */
    findFirst: async ({ where }: { where: MockCondition }) => {
      const rows = store["user_two_factor"] || [];
      if (where && where.operator === "eq") {
        return rows.find((r) => r.userId === where.val) || null;
      }
      return rows[0] || null;
    },
  },
  // Mocks the `db.query.forgotPasswordTokens` table.
  forgotPasswordTokens: {
    /**
     * Simulates the `findFirst` query for the `forgot_password_tokens` table.
     * @returns A promise that resolves to the found row or `undefined`.
     */
    findFirst: async ({ where }: { where: MockCondition }) => {
      const rows = store["forgot_password_tokens"] || [];
      if (where && where.operator === "eq") {
        return rows.find((r) => r.token === where.val || r.identifier === where.val);
      }
      return rows[0];
    },
  },
  // Mocks the `db.query.verificationTokens` table.
  verificationTokens: {
    /**
     * Simulates the `findFirst` query for the `verification_tokens` table.
     * @returns A promise that resolves to the found row or `undefined`.
     */
    findFirst: async ({ where }: { where: MockCondition }) => {
      const rows = store["verification_tokens"] || [];
      if (where && where.operator === "eq") {
        return rows.find((r) => r.token === where.val || r.identifier === where.val);
      }
      return rows[0];
    },
  },
  // Mocks the `db.query.twoFactorRecoveryCodes` table.
  twoFactorRecoveryCodes: {
    /**
     * Simulates the `findMany` query for the `two_factor_recovery_codes` table.
     * @returns A promise that resolves to an array of found rows.
     */
    findMany: async ({
      where,
      orderBy,
    }: {
      where: MockCondition;
      orderBy?: (codes: MockRow, helpers: { asc: (col: unknown) => unknown }) => unknown[];
    }) => {
      const rows = store["two_factor_recovery_codes"] || [];
      let result = rows;
      if (where && where.operator === "eq") {
        result = rows.filter((r) => r.userId === where.val);
      }
      // The orderBy function is called to simulate its presence but does not affect the result in this mock.
      if (orderBy && result.length > 0) {
        orderBy(result[0], { asc: (col: unknown) => col });
      }
      return result;
    },
  },
  // Mocks the `db.query.sessions` table.
  sessions: {
    /**
     * Simulates the `findFirst` query for the `sessions` table.
     * @returns A promise that resolves to the found row or `null`.
     */
    findFirst: async ({ where }: { where: MockCondition }) => {
      const rows = store["sessions"] || [];
      if (where && where.operator === "eq") {
        getValue(rows[0] || {}, getColName(where.col));
        return rows.find((r) => r.sessionToken === where.val || r.id === where.val) || null;
      }
      return rows[0] || null;
    },
  },
  // Mocks the `db.query.userSessions` table.
  userSessions: {
    /**
     * Simulates the `findFirst` query for the `user_sessions` table.
     * @returns A promise that resolves to the found row or `null`.
     */
    findFirst: async ({ where }: { where: MockCondition }) => {
      const rows = store["user_sessions"] || [];
      if (where && where.operator === "eq") {
        return rows.find((r) => r.sessionToken === where.val || r.id === where.val) || null;
      }
      return rows[0] || null;
    },
  },
});
