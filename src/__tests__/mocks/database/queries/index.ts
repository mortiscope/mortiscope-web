import { createAccountQueries } from "@/__tests__/mocks/database/queries/account.queries";
import { createAuthQueries } from "@/__tests__/mocks/database/queries/auth.queries";
import { createCasesQueries } from "@/__tests__/mocks/database/queries/cases.queries";
import { createExportsQueries } from "@/__tests__/mocks/database/queries/exports.queries";
import { createResultsQueries } from "@/__tests__/mocks/database/queries/results.queries";
import type { MockRow } from "@/__tests__/mocks/database/types";

// Define a dictionary structure where keys represent table names and values are arrays of mock database rows.
type MockStore = Record<string, MockRow[]>;

/**
 * Aggregates specialized query factory functions into a single unified interface for interacting with the mock database store.
 */
export const createQueries = (store: MockStore) => {
  // Initialize authentication related queries using the provided `store`.
  const authQueries = createAuthQueries(store);
  // Initialize account management queries using the provided `store`.
  const accountQueries = createAccountQueries(store);
  // Initialize case management queries using the provided `store`.
  const casesQueries = createCasesQueries(store);
  // Initialize test result queries using the provided `store`.
  const resultsQueries = createResultsQueries(store);
  // Initialize data export queries using the provided `store`.
  const exportsQueries = createExportsQueries(store);

  // Combine all domain-specific query objects into a single flat object for easier access.
  return {
    ...authQueries,
    ...accountQueries,
    ...casesQueries,
    ...resultsQueries,
    ...exportsQueries,
  };
};
