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
  // Create the core database operations.
  const insertOp = createInsertOperation(mockDbStore);
  const selectOp = createSelectOperation(mockDbStore);
  const updateOp = createUpdateOperation(mockDbStore);
  const deleteOp = createDeleteOperation(mockDbStore);
  const queryOp = createQueries(mockDbStore);

  // Create a transaction context that provides the same operations.
  const createTxContext = () => ({
    insert: insertOp,
    select: selectOp,
    update: updateOp,
    delete: deleteOp,
    query: queryOp,
  });

  return {
    db: {
      // Creates the mock `db.insert()` method.
      insert: insertOp,
      // Creates the mock `db.select()` method.
      select: selectOp,
      // Creates the mock `db.update()` method.
      update: updateOp,
      // Creates the mock `db.delete()` method.
      delete: deleteOp,
      // Creates the mock `db.query` interface for relational queries.
      query: queryOp,
      // Creates the mock `db.transaction()` method to simulate transactional operations.
      transaction: async <T>(
        callback: (tx: ReturnType<typeof createTxContext>) => Promise<T>
      ): Promise<T> => {
        const tx = createTxContext();
        return callback(tx);
      },
    },
  };
};
