import { AuthFormLogo } from "@/features/auth/components/auth-form-logo";

/**
 * Defines the props for the authentication form header component.
 */
interface AuthFormHeaderProps {
  /** The main heading text for the form. */
  title: string;
  /** The subheading or instructional text displayed below the main title. */
  description: string;
}

/**
 * A reusable presentational component that renders a standardized header for
 * authentication forms, including the application logo, a title, and a description.
 *
 * @param {AuthFormHeaderProps} props The props for the component.
 * @returns A React fragment containing the header elements.
 */
export function AuthFormHeader({ title, description }: AuthFormHeaderProps) {
  return (
    <>
      {/* Logo section, links to homepage */}
      <AuthFormLogo />
      {/* Heading and Description for the auth page */}
      <div className="text-center">
        <h1 className="font-plus-jakarta-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          {title}
        </h1>
        <p className="font-inter mt-1 text-sm text-slate-600 md:mt-2">{description}</p>
      </div>
    </>
  );
}

AuthFormHeader.displayName = "AuthFormHeader";
