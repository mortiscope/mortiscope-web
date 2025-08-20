import { type Route } from "next";
import Link from "next/link";

import { AuthFormHeader } from "@/features/auth/components/auth-form-header";

/**
 * Defines the props for the authentication form container component.
 */
interface AuthFormContainerProps {
  /** The main heading text displayed at the top of the form. */
  title: string;
  /** The subheading or instructional text displayed below the title. */
  description: string;
  /** The primary content of the container, typically the form fields and buttons, passed as children. */
  children: React.ReactNode;
  /** Optional text that precedes the link in the footer. */
  footerText?: string;
  /** Optional text for the clickable link in the footer. */
  footerLinkText?: string;
  /** The destination URL for the footer link. */
  footerLinkHref?: Route;
}

/**
 * A reusable layout component that provides a consistent structure for authentication forms.
 * It uses composition to wrap the main form content (`children`) with a standardized
 * header and an optional footer link.
 *
 * @param {AuthFormContainerProps} props The props for the component.
 * @returns A React component representing the structured authentication form container.
 */
export function AuthFormContainer({
  title,
  description,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthFormContainerProps) {
  return (
    // Main container for the auth form
    <div className="flex w-full flex-col items-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
      {/* Renders the standardized header with the provided title and description. */}
      <AuthFormHeader title={title} description={description} />

      {/* Renders the main content of the form, passed in as children. */}
      {children}

      {/* Renders the optional footer section only if all three related props are provided. */}
      {footerText && footerLinkText && footerLinkHref && (
        <p className="font-inter pt-2 text-center text-xs text-slate-600 md:pt-0 md:text-sm">
          {footerText}{" "}
          <Link
            href={footerLinkHref}
            className="relative font-medium text-green-700 after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-green-600 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:text-green-600 hover:after:origin-bottom-left hover:after:scale-x-100"
          >
            {footerLinkText}
          </Link>
        </p>
      )}
    </div>
  );
}

AuthFormContainer.displayName = "AuthFormContainer";
