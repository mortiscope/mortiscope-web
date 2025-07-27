import { and, eq } from "drizzle-orm";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases, type detections, type uploads } from "@/db/schema";
import { ResultsAnalysis } from "@/features/results/components/results-analysis";
import { ResultsDetails } from "@/features/results/components/results-details";
import { ResultsHeader } from "@/features/results/components/results-header";
import { ResultsHeaderSkeleton } from "@/features/results/components/results-header-skeleton";
import { ResultsImages } from "@/features/results/components/results-images";
import {
  ResultsAnalysisSkeleton,
  ResultsDetailsSkeleton,
  ResultsImagesSkeleton,
} from "@/features/results/components/results-skeleton";

/**
 * The high-fidelity skeleton for the entire results page, composed of individual component skeletons.
 */
const ResultsIdPageSkeleton = () => {
  return (
    <>
      <ResultsHeaderSkeleton />
      <div className="flex flex-1 flex-col gap-4 pt-2">
        <ResultsDetailsSkeleton />
        <ResultsAnalysisSkeleton />
        <ResultsImagesSkeleton />
      </div>
    </>
  );
};

/**
 * Dynamically generates page metadata for SEO and browser tabs.
 *
 * @param {Props} props The component props containing the dynamic route parameters.
 * @returns {Promise<Metadata>} A promise resolving to the page's metadata object.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ resultsId: string }>;
}): Promise<Metadata> {
  const { resultsId } = await params;
  const session = await auth();

  // A user must be logged in to view any case metadata.
  if (!session?.user?.id) {
    return { title: "Access Denied • MortiScope" };
  }

  try {
    // Fetch case details, ensuring it belongs to the user.
    const caseData = await db.query.cases.findFirst({
      where: and(eq(cases.id, resultsId), eq(cases.userId, session.user.id)),
      columns: {
        caseName: true,
        status: true,
      },
    });

    // If the case is not found or is still a draft, treat it as "Not Found".
    if (!caseData || caseData.status === "draft") {
      return {
        title: "Case Not Found • MortiScope",
      };
    }

    // If found and active, construct a dynamic title with the case name.
    return {
      title: `${caseData.caseName} • MortiScope`,
    };
  } catch (error) {
    // In case of a database error, return a generic error title.
    console.error("Database Error in generateMetadata:", error);
    return {
      title: "Error • MortiScope",
    };
  }
}

/**
 * A server component that fetches and prepares the data for the results page.
 *
 * @param {Props} props The component props containing the dynamic route parameters.
 * @returns {Promise<JSX.Element>} The rendered page content.
 */
async function ResultsPageContent({ resultsId }: { resultsId: string }) {
  const session = await auth();

  // A user must be logged in to view the page.
  if (!session?.user?.id) {
    notFound();
  }

  // Fetch all data associated with the specific case ID, ensuring the user owns it.
  const caseData = await db.query.cases.findFirst({
    where: and(eq(cases.id, resultsId), eq(cases.userId, session.user.id)),
    // Fetch related uploads, detections, and the final analysis result in the same query.
    with: {
      uploads: {
        with: {
          detections: true,
        },
      },
      analysisResult: true,
    },
  });

  // If no case data is found, if the user does not own it, or if it's a draft, render the standard 404 page.
  if (!caseData || caseData.status === "draft") {
    notFound();
  }

  // Define a more specific type for uploads with detections
  const uploadsWithDetections: (typeof uploads.$inferSelect & {
    detections: (typeof detections.$inferSelect)[];
  })[] = caseData.uploads;

  return (
    <>
      <ResultsHeader caseData={caseData} />
      <div className="flex flex-1 flex-col gap-4 pt-2">
        <ResultsDetails caseData={caseData} />
        <ResultsAnalysis
          caseData={caseData}
          analysisResult={caseData.analysisResult}
          uploads={uploadsWithDetections}
        />
        <ResultsImages initialImages={uploadsWithDetections} />
      </div>
    </>
  );
}

/**
 * The main server component for the dynamic results page.
 * It uses a Suspense boundary to show a skeleton while fetching data.
 *
 * @param {Props} props The component props containing the dynamic route parameters.
 * @returns {JSX.Element} The rendered page component with a loading fallback.
 */
export default async function ResultsPage({ params }: { params: Promise<{ resultsId: string }> }) {
  const { resultsId } = await params;

  return (
    <Suspense fallback={<ResultsIdPageSkeleton />}>
      <ResultsPageContent resultsId={resultsId} />
    </Suspense>
  );
}
