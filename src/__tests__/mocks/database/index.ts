// Re-exports the main factory function for creating a complete mock database instance.
export { createMockDb } from "@/__tests__/mocks/database/mock";

// Re-exports the shared in-memory data store and its reset utility.
export { mockDbStore, resetMockDb } from "@/__tests__/mocks/database/store";

// Re-exports the core TypeScript types and interfaces used by the mocking system.
export type { MockCondition, MockRow, MockTable } from "@/__tests__/mocks/database/types";
