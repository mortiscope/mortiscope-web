import { GetObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { s3 } from "@/lib/aws";
import { env } from "@/lib/env";

/**
 * Handles a GET request to fetch and stream a specific image for an authenticated user.
 * It ensures that a user can only access images they own.
 *
 * @param _request The incoming Next.js request object (unused).
 * @param params An object containing the dynamic route parameters, in this case the `imageId`.
 * @returns A `NextResponse` streaming the image data on success, or an error response on failure.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  // Authenticate the user's session to ensure they are logged in.
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Extract the requested `imageId` from the route parameters.
  const { imageId } = await params;

  // Authorize the request by querying the database.
  const upload = await db.query.uploads.findFirst({
    where: and(eq(uploads.id, imageId), eq(uploads.userId, session.user.id)),
    columns: { key: true, type: true },
  });

  // If no authorized record is found, return a 404 Not Found error.
  if (!upload) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Prepare the command to fetch the object from the S3 bucket.
  const command = new GetObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: upload.key,
  });

  try {
    // Execute the command to retrieve the object from S3.
    const s3Response = await s3.send(command);

    // If the S3 object has no body, it's likely an error or the file is empty.
    if (!s3Response.Body) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Transform the S3 stream into a web-standard ReadableStream.
    const stream = s3Response.Body.transformToWebStream();

    // Return a successful streaming response.
    return new NextResponse(stream, {
      headers: {
        // Set the appropriate Content-Type, falling back to S3's metadata or a generic type.
        "Content-Type": upload.type || s3Response.ContentType || "application/octet-stream",
        // Set caching headers. `private` ensures it's only cached by the user's browser.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    // Catch any errors during the S3 interaction and return a generic server error.
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
