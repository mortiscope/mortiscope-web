"use client";

import { useMutation } from "@tanstack/react-query";
import { fileTypeFromBlob } from "file-type";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import {
  generateProfileImageUploadUrl,
  updateProfileImageUrl,
} from "@/features/account/actions/update-profile-image";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

/**
 * Custom hook for handling profile image uploads.
 * Provides file selection, validation, S3 upload, and database update functionality.
 */
export const useProfileImage = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [optimisticImageUrl, setOptimisticImageUrl] = useState<string | null>(null);

  // Mutation for generating presigned URL
  const generateUrlMutation = useMutation({
    mutationFn: generateProfileImageUploadUrl,
  });

  // Mutation for updating profile image URL in database
  const updateUrlMutation = useMutation({
    mutationFn: updateProfileImageUrl,
  });

  /**
   * Validates a file before upload
   */
  const validateFile = useCallback(async (file: File): Promise<boolean> => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Image is too large. Maximum size is ${formatBytes(MAX_FILE_SIZE)}.`);
      return false;
    }

    // Check file type
    if (!Object.keys(ACCEPTED_IMAGE_TYPES).includes(file.type)) {
      toast.error("Invalid file type. Please select a JPEG, PNG, WebP, HEIC, or HEIF image.");
      return false;
    }

    // Additional MIME type validation
    try {
      const fileType = await fileTypeFromBlob(file);
      if (!fileType || !Object.keys(ACCEPTED_IMAGE_TYPES).includes(fileType.mime)) {
        toast.error("Invalid or corrupted image file.");
        return false;
      }
    } catch {
      toast.error("Failed to validate image file.");
      return false;
    }

    return true;
  }, []);

  /**
   * Uploads file to S3 using presigned URL
   */
  const uploadToS3 = useCallback(async (url: string, file: File): Promise<boolean> => {
    try {
      const response = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      return true;
    } catch {
      toast.error("Failed to upload image. Please try again.");
      return false;
    }
  }, []);

  /**
   * Handles the complete upload process
   */
  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);

      try {
        // Validate file
        const isValid = await validateFile(file);
        if (!isValid) {
          return;
        }

        // Generate presigned URL
        const formData = new FormData();
        formData.append("file", file);

        const urlResult = await generateUrlMutation.mutateAsync(formData);
        if (!urlResult.success || !urlResult.data) {
          toast.error(urlResult.error || "Failed to prepare upload.");
          return;
        }

        // Upload to S3
        const uploadSuccess = await uploadToS3(urlResult.data.url, file);
        if (!uploadSuccess) {
          return;
        }

        // Use the public URL provided by the server
        const publicUrl = urlResult.data.publicUrl || urlResult.data.url;

        // Add cache-busting parameter to the URL
        const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

        // Update database
        const updateResult = await updateUrlMutation.mutateAsync(cacheBustedUrl);
        if (!updateResult.success) {
          toast.error(updateResult.error || "Failed to update profile.");
          return;
        }

        // Set optimistic image URL for immediate UI update
        setOptimisticImageUrl(cacheBustedUrl);

        // Store in localStorage to share with other components
        localStorage.setItem("optimistic-profile-image", cacheBustedUrl);

        // Dispatch custom event to notify other components in the same tab
        window.dispatchEvent(new Event("optimistic-image-update"));

        toast.success("Profile image successfully updated.");
      } catch {
        toast.error("An unexpected error occurred.");
      } finally {
        setIsUploading(false);
      }
    },
    [generateUrlMutation, updateUrlMutation, uploadToS3, validateFile]
  );

  /**
   * Handles file input change
   */
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFileUpload]
  );

  /**
   * Triggers file selection dialog
   */
  const selectFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Clears the optimistic state
   */
  const clearOptimisticState = useCallback(() => {
    setOptimisticImageUrl(null);
    localStorage.removeItem("optimistic-profile-image");

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event("optimistic-image-update"));
  }, []);

  return {
    fileInputRef,
    isUploading,
    selectFile,
    handleFileChange,
    isPending: generateUrlMutation.isPending || updateUrlMutation.isPending,
    optimisticImageUrl,
    clearOptimisticState,
  };
};
