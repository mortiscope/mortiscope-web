/**
 * A simplified interface that represents a Drizzle ORM table schema object.
 */
export interface MockTable {
  /** An internal property structure that mirrors a common pattern in Drizzle table objects. */
  _: {
    /** The name of the database table. */
    name: string;
  };
}

/**
 * An interface that defines the structure for a simulated query condition.
 */
export interface MockCondition {
  /** The comparison operator (e.g., "eq", "inArray", "and", "isNull"). */
  operator: string;
  /** The Drizzle column schema object or column name string being queried against. */
  col: unknown;
  /** The single value to be used in the comparison (for operators like "eq", "gte", "lte"). */
  val: unknown;
  /** An array of values, used specifically for the "inArray" operator. */
  vals?: unknown[];
  /** An array of nested `MockCondition` objects, used for the "and" operator. */
  conditions?: MockCondition[];
}

/**
 * A generic interface for a single row of data within the in-memory mock store.
 */
export interface MockRow extends Record<string, unknown> {
  id?: string;
  email?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
