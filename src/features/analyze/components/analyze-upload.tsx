"use client";

import { CaseUpload } from "@/features/cases/components/case-upload";

/**
 * Renders the file upload interface for an analysis case.
 * This component handles file selection, validation, and the upload process.
 */
export const AnalyzeUpload = () => {
  return <CaseUpload />;
};

AnalyzeUpload.displayName = "AnalyzeUpload";
