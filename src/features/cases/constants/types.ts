/**
 * Defines a standard response structure for server actions.
 * @template T The type of the data returned on success.
 */
export type ServerActionResponse<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string };
