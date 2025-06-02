import { PiCheckCircleFill, PiWarningCircleFill } from "react-icons/pi";

import { cn } from "@/lib/utils";

type FormFeedbackType = "success" | "error";

interface FormFeedbackProps {
  message?: string;
  type: FormFeedbackType;
}

const feedbackVariants = {
  success: {
    bg: "bg-green-200/70",
    text: "text-green-700",
    icon: PiCheckCircleFill,
  },
  error: {
    bg: "bg-rose-200/70",
    text: "text-rose-700",
    icon: PiWarningCircleFill,
  },
};

export function FormFeedback({ message, type }: FormFeedbackProps) {
  if (!message) {
    return null;
  }

  const { bg, text, icon: Icon } = feedbackVariants[type];

  return (
    <div
      className={cn(
        "font-inter flex w-full items-center justify-center gap-x-2 rounded-lg p-2 text-center text-sm md:p-2.5",
        bg,
        text
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <p>{message}</p>
    </div>
  );
}
