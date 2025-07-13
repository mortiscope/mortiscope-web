import { type Metadata } from "next";

import { ResultsContainer } from "@/features/results/components/results-container";

/**
 * Server-side metadata for the Results page.
 */
export const metadata: Metadata = {
  title: "Results • MortiScope",
};

/**
 * The main page component for the results page.
 */
const ResultsPage = () => {
  return <ResultsContainer />;
};

export default ResultsPage;
