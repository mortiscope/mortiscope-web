import type { Metadata } from "next";

import { AnalyzeDynamicMetatitle } from "@/features/analyze/components/analyze-dynamic-metatitle";

/**
 * Server-side metadata for the Analyze page.
 */
export const metadata: Metadata = {
  title: "Analyze — Analysis Details • MortiScope",
};

/**
 * The main page component for the multi-step analysis workflow.
 */
const AnalyzePage = () => {
  return <AnalyzeDynamicMetatitle />;
};

export default AnalyzePage;
