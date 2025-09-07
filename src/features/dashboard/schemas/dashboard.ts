import { z } from "zod";

/**
 * A reusable schema for validating a user's current password input.
 */
const currentPasswordValidationSchema = z
  .string()
  .min(1, { message: "Current password is required." });

/**
 * Schema for the delete selected cases modal.
 * Validates password and case IDs array.
 */
export const DeleteSelectedCasesSchema = z.object({
  currentPassword: currentPasswordValidationSchema,
  caseIds: z.array(z.cuid2()).min(1, { message: "At least one case must be selected." }),
});

/**
 * Exports TypeScript type inferred from the Zod schema.
 */
export type DeleteSelectedCasesFormValues = z.infer<typeof DeleteSelectedCasesSchema>;
