import type { MockCondition, MockRow, MockTable } from "@/__tests__/mocks/database/types";
import {
  getColName,
  getTableName,
  getValue,
  matchesCondition,
} from "@/__tests__/mocks/database/utils";

/**
 * A type representing the in-memory database store, where keys are table names and values are arrays of mock data rows.
 */
type MockStore = Record<string, MockRow[]>;

/**
 * A factory function that creates a mock implementation of the `db.insert()` method.
 * @param store The shared in-memory database store.
 */
export const createInsertOperation = (store: MockStore) => {
  return (table: MockTable) => ({
    /** Simulates the `.values()` method of a Drizzle insert query. */
    values: (data: MockRow | MockRow[]) => {
      const tableName = getTableName(table);
      if (!store[tableName]) store[tableName] = [];

      const entries = Array.isArray(data) ? data : [data];
      // Auto-populate common fields like `id`, `createdAt`, and `updatedAt` if they are not provided.
      const processed = entries.map((e) => ({
        ...e,
        id: e.id || Math.random().toString(36).substring(7),
        createdAt: e.createdAt || new Date(),
        updatedAt: e.updatedAt || new Date(),
      }));

      // Add the new rows to the in-memory store.
      store[tableName].push(...processed);

      return {
        /** Simulates the `.returning()` method, resolving with the inserted data. */
        returning: async () => processed,
        /** Provides a basic `then` method for promise-like behavior. */
        then: (resolve: (value: void) => void, reject?: (reason: unknown) => void) =>
          Promise.resolve().then(resolve, reject),
        /** Simulates Drizzle's `onConflictDoUpdate` for upsert functionality. */
        onConflictDoUpdate: async ({ target, set }: { target: unknown; set: unknown }) => {
          const colName = getColName(target);
          if (!colName) return;

          const inserted = processed[0];
          if (!inserted) return;

          // Find an existing row with the same unique key.
          const existingIndex = store[tableName].findIndex(
            (r) => getValue(r, colName) === getValue(inserted, colName) && r !== inserted
          );

          if (existingIndex !== -1) {
            // If a conflict is found, remove the newly inserted row and update the existing one.
            store[tableName] = store[tableName].filter((r) => r !== inserted);
            store[tableName][existingIndex] = {
              ...store[tableName][existingIndex],
              ...(set as object),
            };
          }

          return {
            returning: async () => [
              store[tableName][
                existingIndex !== -1 ? existingIndex : store[tableName].indexOf(inserted)
              ],
            ],
          };
        },
      };
    },
  });
};

/**
 * A factory function that creates a mock implementation of the `db.select()` method.
 * @param store The shared in-memory database store.
 */
export const createSelectOperation = (store: MockStore) => {
  return (selection?: Record<string, unknown>) => ({
    /** Simulates the `.from()` method of a Drizzle select query. */
    from: (table: MockTable) => {
      let filteredRows: MockRow[] = [];
      let joinedTable: MockTable | null = null;

      /** A helper function to build and filter the final result set based on a condition. */
      const buildResult = (condition: MockCondition | null) => {
        const tableName = getTableName(table);
        const rows = store[tableName] || [];

        /** Applies a condition (e.g., `where` clause) to a set of rows. */
        const applyCondition = (rowsToFilter: MockRow[], cond: MockCondition | null): MockRow[] => {
          if (!cond) return [...rowsToFilter];

          if (cond.operator === "and" && Array.isArray(cond.conditions)) {
            return rowsToFilter.filter((row) =>
              cond.conditions!.every((c) => matchesCondition(row, c))
            );
          }

          return rowsToFilter.filter((row) => matchesCondition(row, cond));
        };

        filteredRows = applyCondition(rows, condition);

        // If a join has been specified, perform a simplified join operation.
        if (joinedTable) {
          const joinTableName = getTableName(joinedTable);
          const joinRows = store[joinTableName] || [];
          filteredRows = filteredRows.map((row) => {
            const joinMatch = joinRows.find((jr) => jr.userId === row.id);
            if (joinMatch) {
              const { id, enabled, ...joinData } = joinMatch;
              void id; // Suppress unused variable warning.
              return {
                ...row,
                ...joinData,
                twoFactorEnabled: enabled,
              };
            }
            return row;
          });
        }

        return filteredRows;
      };

      return {
        /** Simulates a `.leftJoin()` method. */
        leftJoin: (_joinTable: MockTable) => {
          joinedTable = _joinTable;
          return {
            where: (condition: MockCondition) => ({
              limit: async () => buildResult(condition),
              then: async (resolve: (value: MockRow[]) => void) => resolve(buildResult(condition)),
            }),
          };
        },
        /** Simulates an `.innerJoin()` method with simplified logic. */
        innerJoin: (_joinTable: MockTable) => {
          joinedTable = _joinTable;
          return {
            where: (condition: MockCondition) => ({
              limit: async () => {
                const tableName = getTableName(table);
                const joinTableName = getTableName(_joinTable);
                const primaryRows = store[tableName] || [];
                const joinRows = store[joinTableName] || [];

                const joined: MockRow[] = [];
                for (const row of primaryRows) {
                  const match = joinRows.find((jr) => jr.id === row.caseId);
                  if (match) {
                    joined.push({ ...row, ...match });
                  }
                }

                if (condition) {
                  if (condition.operator === "and" && condition.conditions) {
                    return joined.filter((row) =>
                      condition.conditions!.every((c) => matchesCondition(row, c))
                    );
                  }
                  return joined.filter((row) => matchesCondition(row, condition));
                }
                return joined;
              },
              then: async (resolve: (value: MockRow[]) => void) => {
                const tableName = getTableName(table);
                const joinTableName = getTableName(_joinTable);
                const primaryRows = store[tableName] || [];
                const joinRows = store[joinTableName] || [];

                const joined: MockRow[] = [];
                for (const row of primaryRows) {
                  const match = joinRows.find((jr) => jr.id === row.caseId);
                  if (match) {
                    joined.push({ ...row, ...match });
                  }
                }

                let result = joined;
                if (condition) {
                  if (condition.operator === "and" && condition.conditions) {
                    result = joined.filter((row) =>
                      condition.conditions!.every((c) => matchesCondition(row, c))
                    );
                  } else {
                    result = joined.filter((row) => matchesCondition(row, condition));
                  }
                }
                resolve(result);
              },
            }),
          };
        },
        /** Simulates the `.where()` method. */
        where: (condition: MockCondition) => {
          /** A helper to process the final result, handling special selections like counts. */
          const processResult = (rows: MockRow[]) => {
            // This is a special case to simulate `select({ imageCount: count() })`.
            if (selection && "imageCount" in selection) {
              return [{ imageCount: rows.length }];
            }
            return rows;
          };

          return {
            orderBy: () => ({
              limit: async () => processResult(buildResult(condition)),
              then: (resolve: (value: unknown[]) => void) =>
                Promise.resolve(processResult(buildResult(condition))).then(resolve),
            }),
            limit: async () => processResult(buildResult(condition)),
            then: async (resolve: (value: unknown[]) => void) =>
              resolve(processResult(buildResult(condition))),
          };
        },
        limit: async () => {
          const tableName = getTableName(table);
          return store[tableName] || [];
        },
      };
    },
  });
};

/**
 * A factory function that creates a mock implementation of the `db.update()` method.
 * @param store The shared in-memory database store.
 */
export const createUpdateOperation = (store: MockStore) => {
  return (table: MockTable) => ({
    /** Simulates the `.set()` method. */
    set: (values: Record<string, unknown>) => ({
      /** Simulates the `.where()` method, finding and updating matching rows. */
      where: async (condition: MockCondition) => {
        const tableName = getTableName(table);
        const rows = store[tableName] || [];

        const rowsToUpdate = rows.filter((row) => matchesCondition(row, condition));

        // Apply the updates to the found rows.
        rowsToUpdate.forEach((row) => {
          Object.assign(row, values);
        });

        return {
          returning: async () => rowsToUpdate,
          rowCount: rowsToUpdate.length,
        };
      },
    }),
  });
};

/**
 * A factory function that creates a mock implementation of the `db.delete()` method.
 * @param store The shared in-memory database store.
 */
export const createDeleteOperation = (store: MockStore) => {
  return (table: MockTable) => ({
    /** Simulates the `.where()` method. */
    where: (condition: MockCondition) => {
      const tableName = getTableName(table);

      /** The core logic for finding and removing rows from the store. */
      const performDelete = () => {
        if (!store[tableName]) return [];

        const initialRows = store[tableName];
        const rowsToKeep: MockRow[] = [];
        const rowsDeleted: MockRow[] = [];

        for (const row of initialRows) {
          let shouldDelete = false;

          // Check if the current row matches the delete condition.
          if (condition && condition.operator === "and" && Array.isArray(condition.conditions)) {
            if (condition.conditions.every((c) => matchesCondition(row, c))) {
              shouldDelete = true;
            }
          } else if (matchesCondition(row, condition)) {
            shouldDelete = true;
          }

          if (shouldDelete) {
            rowsDeleted.push(row);
          } else {
            rowsToKeep.push(row);
          }
        }

        // Overwrite the table in the store with the filtered list of rows to keep.
        store[tableName] = rowsToKeep;
        return rowsDeleted;
      };

      return {
        /** Simulates `.returning()`, resolving with the rows that were deleted. */
        returning: async () => performDelete(),
        /** Provides a `then`-able interface for promise compatibility. */
        then: (resolve: (value: { rowCount: number }) => void, reject?: (error: Error) => void) => {
          try {
            const deleted = performDelete();
            resolve({ rowCount: deleted.length });
          } catch (error) {
            if (reject) reject(error as Error);
          }
          return Promise.resolve({ rowCount: 0 });
        },
        catch: () => {
          return Promise.resolve({ rowCount: 0 });
        },
      };
    },
  });
};
