import { serve } from "inngest/next";

import {
  analysisEvent,
  confirmAccountDeletion,
  executeAccountDeletion,
  exportCaseData,
  exportImageData,
  recalculateCase,
} from "@/inngest/functions";
import { inngest } from "@/lib/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analysisEvent,
    confirmAccountDeletion,
    executeAccountDeletion,
    exportCaseData,
    exportImageData,
    recalculateCase,
  ],
});
