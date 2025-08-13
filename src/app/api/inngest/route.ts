import { serve } from "inngest/next";

import {
  analysisEvent,
  confirmAccountDeletion,
  emailUpdated,
  executeAccountDeletion,
  exportCaseData,
  exportImageData,
  passwordUpdated,
  recalculateCase,
} from "@/inngest/functions";
import { inngest } from "@/lib/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analysisEvent,
    confirmAccountDeletion,
    emailUpdated,
    executeAccountDeletion,
    exportCaseData,
    exportImageData,
    passwordUpdated,
    recalculateCase,
  ],
});
