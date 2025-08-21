import { and, eq } from "drizzle-orm";
import { Metadata } from "next";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases, uploads } from "@/db/schema";

/**
 * Defines the shape of the props passed to the page and its metadata function.
 */
interface EditImagePageProps {
  params: Promise<{
    resultsId: string;
    imageId: string;
  }>;
}

/**
 * A Next.js server function that dynamically generates page metadata for the image editor page. It performs
 * authentication and database lookups to create a specific title based on the case and image names.
 *
 * @param {EditImagePageProps} props The props containing the dynamic route segments.
 * @returns A promise that resolves to a `Metadata` object for the page.
 */
export async function generateMetadata({ params }: EditImagePageProps): Promise<Metadata> {
  // Asynchronously resolve the parameters from the dynamic route.
  const { resultsId, imageId } = await params;
  // Verify that the user is authenticated.
  const session = await auth();

  // If there's no session, return a generic "Access Denied" title.
  if (!session?.user?.id) {
    return { title: "Access Denied • MortiScope" };
  }

  try {
    // Fetch the associated case data, critically ensuring that the current user owns it.
    const caseData = await db.query.cases.findFirst({
      where: and(eq(cases.id, resultsId), eq(cases.userId, session.user.id)),
      columns: {
        caseName: true,
        status: true,
      },
    });

    // Handle cases where the case is not found, not owned by the user, or is just a draft.
    if (!caseData || caseData.status === "draft") {
      return {
        title: "Case Not Found • MortiScope",
      };
    }

    // Fetch the specific image data that belongs to the authenticated case.
    const imageData = await db.query.uploads.findFirst({
      where: and(eq(uploads.id, imageId), eq(uploads.caseId, resultsId)),
      columns: {
        name: true,
      },
    });

    // Handle the case where the image is not found within that case.
    if (!imageData) {
      return {
        title: "Image Not Found • MortiScope",
      };
    }

    // Format the image name by removing the file extension for a cleaner title.
    const imageName = imageData.name.replace(/\.[^/.]+$/, "");

    // On success, construct and return the final, descriptive page title.
    return {
      title: `${caseData.caseName} — ${imageName} • MortiScope`,
    };
  } catch (error) {
    // Catch any unexpected database or runtime errors and return a generic error title.
    console.error("Database Error in generateMetadata:", error);
    return {
      title: "Error • MortiScope",
    };
  }
}

/**
 * The server component for the image editor page.
 */
export default function EditImagePage() {
  return null;
}
