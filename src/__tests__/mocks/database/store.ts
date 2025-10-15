import type { MockRow } from "@/__tests__/mocks/database/types";

/**
 * The central in-memory database store.
 */
export const mockDbStore: Record<string, MockRow[]> = {
  users: [],
  accounts: [],
  user_two_factor: [],
  two_factor_recovery_codes: [],
  forgot_password_tokens: [],
  verification_tokens: [],
  user_sessions: [],
  sessions: [],
  revoked_jwt_tokens: [],
  cases: [],
  case_audit_logs: [],
  analysis_results: [],
  account_deletion_tokens: [],
  email_change_tokens: [],
  exports: [],
  uploads: [],
  detections: [],
};

/**
 * A utility function to reset the entire `mockDbStore` to its initial empty state.
 */
export function resetMockDb() {
  // Iterates over all keys (table names) in the store and resets each to an empty array.
  for (const key of Object.keys(mockDbStore)) {
    mockDbStore[key] = [];
  }
}
