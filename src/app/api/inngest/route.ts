import { serve } from "inngest/next";

import { analysisEvent } from "@/inngest/functions";
import { inngest } from "@/lib/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analysisEvent],
});
