import {
  createDeleteOperation,
  createInsertOperation,
  createSelectOperation,
  createUpdateOperation,
} from "@/__tests__/mocks/database/operations";
import { createQueries } from "@/__tests__/mocks/database/queries";
import { mockDbStore } from "@/__tests__/mocks/database/store";

/**
 * A factory function that constructs a complete, in-memory mock of the Drizzle ORM `db` object.
 * @returns An object containing the fully mocked `db` instance for use in tests.
 */
export const createMockDb = () => {
  return {
    db: {
      // Creates the mock `db.insert()` method.
      insert: createInsertOperation(mockDbStore),
      // Creates the mock `db.select()` method.
      select: createSelectOperation(mockDbStore),
      // Creates the mock `db.update()` method.
      update: createUpdateOperation(mockDbStore),
      // Creates the mock `db.delete()` method.
      delete: createDeleteOperation(mockDbStore),
      // Creates the mock `db.query` interface for relational queries.
      query: createQueries(mockDbStore),
    },
  };
};
