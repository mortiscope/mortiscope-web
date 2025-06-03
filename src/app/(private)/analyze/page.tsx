"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AnalyzeProgress } from "@/features/analyze/components/analyze-progress";
import { AnalyzeWizard } from "@/features/analyze/components/analyze-wizard";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

/**
 * The main page component for the multi-step analysis workflow.
 */
const AnalyzePage = () => {
  // Subscribes to the global store to get the current step number.
  const step = useAnalyzeStore((state) => state.step);

  return (
    // Main container for the analyze page.
    <Card className="w-full rounded-2xl shadow-none md:rounded-3xl">
      {/* The header section. */}
      <CardHeader>
        <div className="mx-auto w-full">
          <AnalyzeProgress currentStep={step} />
        </div>
      </CardHeader>

      {/* A visual separator between the header and the main content. */}
      <Separator className="border" />

      {/* The main content section that houses the wizard. */}
      <CardContent className="min-h-[450px] overflow-hidden">
        <AnalyzeWizard />
      </CardContent>
    </Card>
  );
};

export default AnalyzePage;
