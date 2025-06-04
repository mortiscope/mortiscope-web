"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!font-inter !border-2",
          title: "!font-normal",
        },
      }}
      style={
        {
          "--border-radius": "0.75rem",
          
          // Default/Info
          "--normal-bg": "#e0f2fe",
          "--normal-border": "#38bdf8",
          "--normal-text": "#0369a1",

          // Success
          "--success-bg": "#d1fae5",
          "--success-border": "#34d399",
          "--success-text": "#065f46",

          // Error
          "--error-bg": "#ffe4e6",
          "--error-border": "#fb7185",
          "--error-text": "#9f1239",

          // Warning
          "--warning-bg": "#fef3c7",
          "--warning-border": "#fbbf24",
          "--warning-text": "#92400e",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
