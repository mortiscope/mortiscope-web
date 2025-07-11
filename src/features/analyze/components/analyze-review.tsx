"use client";

import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitUpload } from "@/features/analyze/actions/submit-upload";
import { UploadPreviewModal } from "@/features/analyze/components/upload-preview-modal";
import { detailsSchema } from "@/features/analyze/schemas/details";
import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { cn } from "@/lib/utils";

// A shared class string for consistent button styling throughout the component.
const buttonClasses =
  "font-inter relative h-9 flex-1 cursor-pointer overflow-hidden rounded-lg border-none bg-emerald-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-green-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:h-10 md:text-base";

/**
 * Renders the final review and submission step of the analysis form.
 * It displays a summary of all entered data and uploaded images.
 */
export const AnalyzeReview = () => {
  // Retrieves state and actions from the global Zustand store.
  const { prevStep, details, data, reset: resetAnalyzeStore } = useAnalyzeStore();
  const files = data.files;
  const router = useRouter();

  // State to manage the visibility of the image preview modal.
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State to store the currently selected file for the preview modal.
  const [selectedFile, setSelectedFile] = useState<UploadableFile | null>(null);

  // State to store local blob URLs for newly uploaded files to enable previews.
  const [objectUrls, setObjectUrls] = useState<Map<string, string>>(new Map());

  // Mutation for submitting the analysis data to the server.
  const { mutate: performSubmit, isPending } = useMutation({
    mutationFn: submitUpload,
    onSuccess: (response) => {
      if (response.success) {
        toast.success(response.message);
        resetAnalyzeStore();
        // Redirect to the dashboard after a successful submission.
        router.push("/dashboard");
      } else {
        toast.error(response.message || "An unknown error occurred.");
      }
    },
    onError: (error) => {
      toast.error("Submission failed: " + error.message);
    },
  });

  // Memoizes the final temperature value, defaulting to 0.
  const finalTemperatureValue = details.temperature?.value ?? 0;

  // Constructs a complete, comma-separated address string from location details.
  const fullAddress = [
    details.location?.barangay?.name,
    details.location?.city?.name,
    details.location?.province?.name,
    details.location?.region?.name,
  ]
    .filter(Boolean)
    .join(", ");

  /**
   * Manages local object URLs for previewing newly uploaded files.
   */
  useEffect(() => {
    const newObjectUrls = new Map<string, string>();
    let hasChanges = false;

    files.forEach((file) => {
      if (file.file && !file.url) {
        const objectUrl = URL.createObjectURL(file.file);
        newObjectUrls.set(file.id, objectUrl);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setObjectUrls(newObjectUrls);
    }

    // Cleanup: Revoke the object URLs to free up memory.
    return () => {
      newObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  /**
   * Memoizes the list of files, sorted by upload date in descending order.
   * This is a performance optimization that prevents re-sorting on every render.
   */
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => b.dateUploaded.getTime() - a.dateUploaded.getTime());
  }, [files]);

  /**
   * Opens the image review modal and sets the initial file to display.
   * @param file - The `UploadableFile` object to display first.
   */
  const openImageReview = (file: UploadableFile) => {
    setSelectedFile(file);
    setIsModalOpen(true);
  };

  /**
   * Navigates to the next file in the sorted list within the modal.
   */
  const handleNextFile = () => {
    if (!selectedFile) return;
    const currentIndex = sortedFiles.findIndex((f) => f.id === selectedFile.id);
    if (currentIndex < sortedFiles.length - 1) {
      setSelectedFile(sortedFiles[currentIndex + 1]);
    }
  };

  /**
   * Navigates to the previous file in the sorted list within the modal.
   */
  const handlePreviousFile = () => {
    if (!selectedFile) return;
    const currentIndex = sortedFiles.findIndex((f) => f.id === selectedFile.id);
    if (currentIndex > 0) {
      setSelectedFile(sortedFiles[currentIndex - 1]);
    }
  };

  /**
   * Sets the selected file in the modal based on a given file ID.
   * @param fileId - The ID of the file to display.
   */
  const handleSelectFile = (fileId: string) => {
    const file = sortedFiles.find((f) => f.id === fileId);
    if (file) {
      setSelectedFile(file);
    }
  };

  /**
   * Prepares and "submits" the final analysis data.
   * In this implementation, it logs the data to the console for simulation purposes.
   */
  const handleSubmit = () => {
    // Re-validate the details from the store as a safeguard.
    const validation = detailsSchema.safeParse(details);
    if (!validation.success) {
      toast.error("Form data is invalid. Please go back and check the details.");
      console.error("Validation errors:", validation.error.flatten());
      return;
    }

    // Ensure at least one file has been uploaded.
    if (files.length === 0) {
      toast.error("Please upload at least one image to submit.");
      return;
    }

    const validatedDetails = validation.data;

    // Convert temperature to Celsius before submission, as the database requires it.
    let temperatureInCelsius = validatedDetails.temperature.value;
    if (validatedDetails.temperature.unit === "F") {
      temperatureInCelsius = (validatedDetails.temperature.value - 32) * (5 / 9);
    }

    // Call the mutation with the prepared data.
    performSubmit({
      details: {
        ...validatedDetails,
        temperature: {
          value: temperatureInCelsius,
          unit: "C",
        },
      },
      uploadIds: files.map((file) => file.id),
    });
  };

  /**
   * Determines the correct URL for an image preview.
   * It prioritizes a persistent remote URL over a temporary local object URL.
   * @param file - The `UploadableFile` object.
   * @returns The appropriate URL string for the image source.
   */
  const getPreviewUrl = (file: UploadableFile) => {
    return file.url || objectUrls.get(file.id) || "";
  };

  return (
    <>
      {/* Renders the modal for viewing images, controlled by component state. */}
      <UploadPreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        file={selectedFile}
        onNext={handleNextFile}
        onPrevious={handlePreviousFile}
        onSelectFile={handleSelectFile}
      />

      <Card className="border-none py-2 shadow-none">
        {/* Main header for the review step. */}
        <CardHeader className="px-0 text-center">
          <CardTitle className="font-plus-jakarta-sans text-xl">Review and Submit</CardTitle>
          <CardDescription className="font-inter">
            Carefully review the details and images below before finalzing the submission.
          </CardDescription>
        </CardHeader>

        <div className="space-y-6 px-0">
          {/* Card section for displaying a grid of uploaded image previews. */}
          <Card className="border-2 border-slate-200 shadow-none">
            <CardHeader className="py-0 text-center md:text-left">
              <CardTitle className="font-plus-jakarta-sans text-lg">Image Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedFiles.length === 0 ? (
                <p className="font-inter text-muted-foreground">No images were uploaded.</p>
              ) : (
                <>
                  {/* Large Screen Layout */}
                  <div className="hidden grid-cols-5 gap-4 lg:grid">
                    {sortedFiles.slice(0, 4).map((file) => (
                      <button
                        key={file.id}
                        onClick={() => openImageReview(file)}
                        className="group ring-offset-background relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl ring-2 ring-emerald-500 ring-offset-2"
                      >
                        <Image
                          src={getPreviewUrl(file)}
                          alt={`Uploaded image ${file.name}`}
                          fill
                          className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      </button>
                    ))}
                    {sortedFiles.length >= 5 && (
                      <button
                        onClick={() => openImageReview(sortedFiles[4])}
                        className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl"
                      >
                        <Image
                          src={getPreviewUrl(sortedFiles[4])}
                          alt={sortedFiles.length > 5 ? "More images" : `Uploaded image 5`}
                          fill
                          className={cn("object-cover", sortedFiles.length > 5 && "blur-sm")}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                        {/* Renders an overlay indicating the number of additional hidden images. */}
                        {sortedFiles.length > 5 && (
                          <div className="font-inter absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                            <span className="text-2xl font-bold">+{sortedFiles.length - 4}</span>
                            <span>View All</span>
                          </div>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Medium Screen Layout */}
                  <div className="hidden grid-cols-3 gap-4 sm:grid lg:hidden">
                    {sortedFiles.slice(0, 2).map((file) => (
                      <button
                        key={file.id}
                        onClick={() => openImageReview(file)}
                        className="group ring-offset-background relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl ring-2 ring-emerald-500 ring-offset-2"
                      >
                        <Image
                          src={getPreviewUrl(file)}
                          alt={`Uploaded image ${file.name}`}
                          fill
                          className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      </button>
                    ))}
                    {sortedFiles.length >= 3 && (
                      <button
                        onClick={() => openImageReview(sortedFiles[2])}
                        className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl"
                      >
                        <Image
                          src={getPreviewUrl(sortedFiles[2])}
                          alt={sortedFiles.length > 3 ? "More images" : `Uploaded image 3`}
                          fill
                          className={cn("object-cover", sortedFiles.length > 3 && "blur-sm")}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                        {sortedFiles.length > 3 && (
                          <div className="font-inter absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                            <span className="text-2xl font-bold">+{sortedFiles.length - 2}</span>
                            <span>View All</span>
                          </div>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Small Screen Layout */}
                  <div className="grid grid-cols-2 gap-4 sm:hidden">
                    {sortedFiles.slice(0, 1).map((file) => (
                      <button
                        key={file.id}
                        onClick={() => openImageReview(file)}
                        className="group ring-offset-background relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl ring-2 ring-emerald-500 ring-offset-2"
                      >
                        <Image
                          src={getPreviewUrl(file)}
                          alt={`Uploaded image ${file.name}`}
                          fill
                          className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                      </button>
                    ))}
                    {sortedFiles.length >= 2 && (
                      <button
                        onClick={() => openImageReview(sortedFiles[1])}
                        className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-xl"
                      >
                        <Image
                          src={getPreviewUrl(sortedFiles[1])}
                          alt={sortedFiles.length > 2 ? "More images" : `Uploaded image 2`}
                          fill
                          className={cn("object-cover", sortedFiles.length > 2 && "blur-sm")}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        />
                        {sortedFiles.length > 2 && (
                          <div className="font-inter absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white">
                            <span className="text-2xl font-bold">+{sortedFiles.length - 1}</span>
                            <span>View All</span>
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card section for displaying a summary of the case details. */}
          <Card className="border-2 border-slate-200 shadow-none">
            <CardHeader className="py-0 text-center md:text-left">
              <CardTitle className="font-plus-jakarta-sans text-lg">Analysis Details</CardTitle>
            </CardHeader>
            <CardContent className="font-inter text-sm">
              {/* Uses a CSS grid layout on medium screens and up for better alignment. */}
              <div className="space-y-4 md:grid md:grid-cols-2 md:space-y-0 md:gap-x-8 md:gap-y-4">
                <div className="md:contents">
                  <p className="text-muted-foreground font-medium">Case Name</p>
                  <p className="font-normal">{details.caseName || "N/A"}</p>
                </div>

                <div className="md:contents">
                  <p className="text-muted-foreground font-medium">Temperature</p>
                  <p className="font-normal">
                    {finalTemperatureValue.toFixed(1)} °{details.temperature?.unit || "C"}
                  </p>
                </div>

                <div className="md:contents">
                  <p className="text-muted-foreground font-medium">Case Date</p>
                  <p className="font-normal">
                    {details.caseDate ? format(details.caseDate, "MMMM d, yyyy") : "N/A"}
                  </p>
                </div>

                <div className="md:contents">
                  <p className="text-muted-foreground font-medium">Location</p>
                  <p className="font-normal">{fullAddress || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer containing navigation and submission buttons. */}
        <CardFooter className="flex justify-between gap-x-4 px-0 pt-8">
          <Button onClick={prevStep} disabled={isPending} className={cn(buttonClasses)}>
            Previous
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className={cn(buttonClasses)}>
            {isPending ? "Submitting..." : "Submit"}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
};
