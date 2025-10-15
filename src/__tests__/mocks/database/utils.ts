import type { MockCondition, MockRow, MockTable } from "@/__tests__/mocks/database/types";

/**
 * Extracts the table name string from a Drizzle ORM table schema object.
 * @param table The Drizzle table schema object.
 * @returns The name of the table as a string.
 */
export const getTableName = (table: MockTable): string => {
  // Drizzle ORM stores the table name in a non-enumerable symbol property.
  const drizzleNameSymbol = Symbol.for("drizzle:Name");
  if (table && typeof table === "object" && drizzleNameSymbol in table) {
    return (table as Record<symbol, string>)[drizzleNameSymbol];
  }
  // Falls back to a common internal property structure if the symbol is not found.
  return table._?.name || "users";
};

/**
 * Extracts the column name string from a Drizzle ORM column schema object or a plain string.
 * @param col The Drizzle column schema object or a column name string.
 * @returns The name of the column as a string, or `null` if it cannot be determined.
 */
export const getColName = (col: unknown): string | null => {
  // Handles the case where `col` is a Drizzle column object.
  if (col && typeof col === "object" && "name" in col) {
    return (col as { name: string }).name;
  }
  // Handles the case where `col` is already a string.
  if (typeof col === "string") return col;
  return null;
};

/**
 * A utility function to convert a snake_case string to camelCase.
 * @param str The input string in snake_case.
 * @returns The converted string in camelCase.
 */
export const toCamelCase = (str: string) => {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

/**

 * Retrieves a value from a mock row object.
 *
 * @param row The mock data row object.
 * @param colName The name of the column to retrieve.
 * @returns The value from the row, or `undefined` if not found.
 */
export const getValue = (row: MockRow, colName: string | null) => {
  if (!colName) return undefined;
  // First, try to access the value using the exact column name.
  if (colName in row) return row[colName];

  // If not found, convert the name to camelCase and try again.
  const camel = toCamelCase(colName);
  if (camel in row) return row[camel];

  return undefined;
};

/**
 * The core logic for simulating a `WHERE` clause.
 *
 * @param row The mock data row to evaluate.
 * @param cond The condition object representing the `WHERE` clause.
 * @returns `true` if the row matches the condition, `false` otherwise.
 */
export const matchesCondition = (row: MockRow, cond: MockCondition): boolean => {
  const colName = getColName(cond.col);

  // Simulates the `eq` (equals) operator.
  if (cond.operator === "eq") {
    const val = getValue(row, colName);
    if (val !== undefined) {
      return val === cond.val;
    }
    // Heuristic fallback for common primary/foreign key lookups when the column name is generic.
    return (
      row.id === cond.val ||
      row.email === cond.val ||
      row.userId === cond.val ||
      row.sessionToken === cond.val
    );
  }
  // Simulates the `inArray` operator.
  if (cond.operator === "inArray") {
    const { vals } = cond;
    if (Array.isArray(vals)) {
      const val = getValue(row, colName);
      if (val !== undefined) {
        return vals.includes(val);
      }
      // Heuristic fallback for common key lookups.
      return vals.includes(row.sessionToken) || vals.includes(row.id);
    }
  }
  // Simulates the `isNull` operator.
  if (cond.operator === "isNull") {
    const val = getValue(row, colName);
    return val === null || val === undefined;
  }
  // Simulates the `gte` (greater than or equal to) operator for dates and numbers.
  if (cond.operator === "gte") {
    const val = getValue(row, colName);
    if (val instanceof Date && cond.val instanceof Date) {
      return val.getTime() >= cond.val.getTime();
    }
    return (val as number) >= (cond.val as number);
  }
  // Simulates the `lte` (less than or equal to) operator for dates and numbers.
  if (cond.operator === "lte") {
    const val = getValue(row, colName);
    if (val instanceof Date && cond.val instanceof Date) {
      return val.getTime() <= cond.val.getTime();
    }
    return (val as number) <= (cond.val as number);
  }
  // Simulates the `and` operator by recursively checking all nested conditions.
  if (cond.operator === "and") {
    const { conditions } = cond;
    if (Array.isArray(conditions)) {
      return conditions.every((c) => matchesCondition(row, c));
    }
  }
  // If the operator is not recognized or the condition is malformed, default to a "pass".
  return true;
};
