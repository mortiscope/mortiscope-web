import { serve } from "inngest/next";

import {
  analysisEvent,
  checkSessionInactivity,
  confirmAccountDeletion,
  deleteInactiveSession,
  emailUpdated,
  executeAccountDeletion,
  exportCaseData,
  exportImageData,
  handleSessionTracking,
  passwordUpdated,
  recalculateCase,
  scheduleSessionDeletion,
  triggerSessionCleanup,
} from "@/inngest/functions";
import { inngest } from "@/lib/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analysisEvent,
    checkSessionInactivity,
    confirmAccountDeletion,
    deleteInactiveSession,
    emailUpdated,
    executeAccountDeletion,
    exportCaseData,
    exportImageData,
    handleSessionTracking,
    passwordUpdated,
    recalculateCase,
    scheduleSessionDeletion,
    triggerSessionCleanup,
  ],
});
