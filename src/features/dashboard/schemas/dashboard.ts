import { z } from "zod";

/**
 * Defines the TypeScript interface for a single row of data in the dashboard table.
 */
export interface CaseData {
  caseId: string;
  caseName: string;
  caseDate: string;
  verificationStatus: string;
  pmiEstimation: string;
  oldestStage: string;
  averageConfidence: string;
  imageCount: number;
  detectionCount: number;
  location: {
    region: string;
    province: string;
    city: string;
    barangay: string;
  };
  temperature: string;
}

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
