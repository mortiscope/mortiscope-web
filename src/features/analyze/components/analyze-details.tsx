"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { cn } from "@/lib/utils";

const buttonClasses =
  "font-inter relative h-9 w-1/2 cursor-pointer overflow-hidden rounded-lg border-none bg-emerald-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-green-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:h-10 md:text-base";

export const AnalyzeDetails = () => {
  const nextStep = useAnalyzeStore((state) => state.nextStep);
  const prevStep = useAnalyzeStore((state) => state.prevStep);

  return (
    <Card className="border-none py-2 shadow-none">
      <CardHeader className="px-0 text-center">
        <CardTitle className="font-plus-jakarta-sans text-xl">Analysis Details</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex h-64 w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50"></div>
      </CardContent>
      <CardFooter className="flex justify-between gap-x-4 px-0">
        <Button onClick={prevStep} className={cn(buttonClasses)}>
          Previous
        </Button>
        <Button onClick={nextStep} className={cn(buttonClasses)}>
          Next
        </Button>
      </CardFooter>
    </Card>
  );
};
