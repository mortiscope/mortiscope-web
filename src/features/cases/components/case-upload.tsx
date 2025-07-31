"use client";

import { fileTypeFromBlob } from "file-type";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { UploadDropzone } from "@/features/upload/components/upload-dropzone";
import { UploadFormActions } from "@/features/upload/components/upload-form-actions";
import { UploadFormHeader } from "@/features/upload/components/upload-form-header";
import { UploadMethodTabs } from "@/features/upload/components/upload-method-tabs";
import { useFileProcessor } from "@/features/upload/hooks/use-file-processor";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE, MAX_FILES } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

// Dynamically load heavy modal components
const SupportedFormatsModal = dynamic(
  () =>
    import("@/features/cases/components/supported-formats-modal").then((module) => ({
      default: module.SupportedFormatsModal,
    })),
  { ssr: false }
);
const CaseCapture = dynamic(
  () =>
    import("@/features/cases/components/case-capture").then((module) => ({
      default: module.CaseCapture,
    })),
  { ssr: false }
);
const UploadPreview = dynamic(
  () =>
    import("@/features/upload/components/upload-preview").then((module) => ({
      default: module.UploadPreview,
    })),
  { ssr: false }
);

/**
 * Renders the file upload step of the case creation workflow.
 * Manages UI state for file selection and delegates upload processing to a custom hook.
 */
export const CaseUpload = () => {
  const {
    nextStep,
    prevStep,
    caseId,
    data: { files },
    addFiles,
  } = useAnalyzeStore();

  const filesCount = files.length;
  const [activeTab, setActiveTab] = useState("upload");
  const [isFormatsModalOpen, setIsFormatsModalOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // The core upload logic is now handled entirely by this custom hook.
  useFileProcessor({ files, caseId });

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          let message = `Error with ${file.name}: ${error.message}`;
          if (error.code === "file-too-large")
            message = `${file.name} is larger than ${formatBytes(MAX_FILE_SIZE)}.`;
          else if (error.code === "file-invalid-type")
            message = `${file.name} is not a supported file type.`;
          else if (error.code === "too-many-files")
            message = `You can only upload a maximum of ${MAX_FILES} images in total.`;
          toast.error(message);
        });
      });

      const validationPromises = acceptedFiles.map(async (file) => {
        const type = await fileTypeFromBlob(file);
        if (!Object.keys(ACCEPTED_IMAGE_TYPES).includes(type?.mime ?? "")) {
          toast.error(`${file.name} appears to be corrupted or is not a valid image.`);
          return null;
        }
        return file;
      });

      const validFiles = (await Promise.all(validationPromises)).filter(
        (f): f is File => f !== null
      );
      if (validFiles.length === 0) return;

      if (filesCount + validFiles.length > MAX_FILES) {
        toast.error(
          `Cannot add ${validFiles.length} file(s). You can only upload a maximum of ${MAX_FILES} images.`
        );
        return;
      }

      const currentFileNames = new Set(files.map((f) => f.name));
      const uniqueNewFiles = validFiles.filter((file) => !currentFileNames.has(file.name));
      validFiles
        .filter((file) => currentFileNames.has(file.name))
        .forEach((file) => toast.error(`${file.name} is already in the upload list.`));

      if (uniqueNewFiles.length > 0) addFiles(uniqueNewFiles, "upload");
    },
    [addFiles, files, filesCount]
  );

  const isMaxFilesReached = filesCount >= MAX_FILES;
  const dropzone = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    noClick: activeTab === "camera",
    disabled: isMaxFilesReached || !caseId,
  });

  const isNextDisabled = filesCount === 0 || files.some((file) => file.status !== "success");

  return (
    <>
      <SupportedFormatsModal isOpen={isFormatsModalOpen} onOpenChange={setIsFormatsModalOpen} />
      <CaseCapture isOpen={isCameraOpen} onOpenChange={setIsCameraOpen} />

      <Card className="border-none py-2 shadow-none">
        <UploadFormHeader />
        <CardContent className="px-0">
          <UploadMethodTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isMaxFilesReached={isMaxFilesReached}
          />
          <UploadDropzone
            dropzone={dropzone}
            activeTab={activeTab}
            isMaxFilesReached={isMaxFilesReached}
            caseId={caseId}
            filesCount={filesCount}
            onOpenFormatsModal={() => setIsFormatsModalOpen(true)}
            onOpenCamera={() => setIsCameraOpen(true)}
          />
          <UploadPreview />
        </CardContent>
        <UploadFormActions onPrev={prevStep} onNext={nextStep} isNextDisabled={isNextDisabled} />
      </Card>
    </>
  );
};
