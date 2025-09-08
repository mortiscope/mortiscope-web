"use client";

import { memo } from "react";

/**
 * Defines the props for the dashboard information item component.
 */
interface DashboardInformationItemProps {
  /** The icon component to display. */
  icon: React.ElementType;
  /** The title text for the information item. */
  title: string;
  /** The content to display. */
  children: React.ReactNode;
}

/**
 * A reusable component for list items in dashboard information modals.
 * Displays an icon, title, and content with automatic bullet point formatting for strings.
 */
export const DashboardInformationItem = memo(function DashboardInformationItem({
  icon: Icon,
  title,
  children,
}: DashboardInformationItemProps) {
  // Split the text content by periods to create bullet points
  const sentences =
    typeof children === "string"
      ? children
          .split(".")
          .filter((s) => s.trim().length > 0)
          .map((s) => s.trim() + ".")
      : [];

  return (
    <li className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-200 ease-in-out hover:border-emerald-200 hover:bg-emerald-50">
      {/* First row for the icon and title */}
      <div className="flex items-center">
        <Icon className="mr-3 h-5 w-5 flex-shrink-0 text-emerald-500" />
        <h4 className="font-inter font-medium text-slate-800">{title}</h4>
      </div>
      {/* Bullet list for sentences or JSX content */}
      {typeof children === "string" ? (
        <ul className="font-inter mt-2 space-y-1 text-sm leading-relaxed text-slate-600 marker:text-emerald-500">
          {sentences.map((sentence, index) => (
            <li key={index} className="ml-6 list-disc pl-2">
              {sentence}
            </li>
          ))}
        </ul>
      ) : (
        <div className="font-inter mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
      )}
    </li>
  );
});

DashboardInformationItem.displayName = "DashboardInformationItem";
