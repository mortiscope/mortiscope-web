import { eq } from "drizzle-orm";
import { type Metadata } from "next";

import NotFoundPage from "@/app/not-found";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { ResultsDetails } from "@/features/results/components/results-details";

type Props = {
  params: {
    resultsId: string;
  };
};

/**
 * Dynamically generates page metadata for SEO and browser tabs.
 *
 * @param {Props} props The component props containing the dynamic route parameters.
 * @returns {Promise<Metadata>} A promise resolving to the page's metadata object.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { resultsId } = await params;

  try {
    // Fetch only the case name, as that's all that is needed for the title.
    const caseData = await db.query.cases.findFirst({
      where: eq(cases.id, resultsId),
      columns: {
        caseName: true,
      },
    });

    // If the case is not found, provide a specific "Not Found" title.
    if (!caseData) {
      return {
        title: "Case Not Found • MortiScope",
      };
    }

    // If found, construct a dynamic title with the case name.
    return {
      title: `${caseData.caseName} • MortiScope`,
    };
  } catch (error) {
    // In case of a database error, return a generic error title to prevent a build failure.
    console.error("Database Error in generateMetadata:", error);
    return {
      title: "Error • MortiScope",
    };
  }
}

/**
 * The main server component for the dynamic results page.
 * It fetches the complete data for a specific case to render the page content.
 *
 * @param {Props} props The component props containing the dynamic route parameters.
 * @returns {Promise<JSX.Element>} The rendered page component.
 */
export default async function ResultsPage({ params }: Props) {
  const { resultsId } = await params;

  // Fetch all data associated with the specific case ID.
  const caseData = await db.query.cases.findFirst({
    where: eq(cases.id, resultsId),
  });

  // If no case data is found, trigger 404 page rendering.
  if (!caseData) {
    return <NotFoundPage />;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 pt-2">
      <ResultsDetails caseData={caseData} />
    </div>
  );
}
