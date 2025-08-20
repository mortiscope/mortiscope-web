import Image from "next/image";
import { signIn } from "next-auth/react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * Defines the props for the authentication social provider component.
 */
interface AuthSocialProviderProps {
  /** An optional boolean to disable all buttons, typically passed from a parent form. */
  disabled?: boolean;
  /** The text to display in the middle of the separator line. */
  separatorText: string;
}

/**
 * A presentational component that renders a separator and a set of social login (OAuth) buttons.
 * It manages the pending state for the OAuth sign-in process, which is a client-side navigation,
 * and calls NextAuth's `signIn` function with the appropriate provider.
 *
 * @param {AuthSocialProviderProps} props The props for the component.
 * @returns A React fragment containing the separator and social login buttons.
 */
export function AuthSocialProvider({ disabled = false, separatorText }: AuthSocialProviderProps) {
  const [isSocialPending, startSocialTransition] = useTransition();

  /**
   * Initiates the NextAuth OAuth sign-in flow for a given provider.
   * @param provider The ID of the OAuth provider as recognized by NextAuth.
   */
  const handleOAuthSignIn = (provider: "google" | "orcid" | "microsoft-entra-id") => {
    // Wrap the `signIn` call in `startSocialTransition` to manage the interface's pending state.
    startSocialTransition(async () => {
      try {
        await signIn(provider, {
          callbackUrl: "/dashboard",
        });
      } catch (error) {
        // This catch block will typically only handle client-side errors before the redirect begins.
        console.error("OAuth sign-in error:", error);
      }
    });
  };

  // A derived boolean to determine if the social login buttons should be disabled.
  const areSocialsDisabled = disabled || isSocialPending;

  return (
    <>
      {/* Renders a separator line with text overlaid in the center, a common UI pattern for auth forms. */}
      <div className="relative w-full pt-2 md:pt-0">
        <Separator />
        <span className="font-inter absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform bg-white px-2 text-xs text-slate-500">
          {separatorText}
        </span>
      </div>

      {/* Renders the grid of social login buttons. */}
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
        {/* A static array of provider configurations is mapped to render each button. */}
        {[
          { src: "/logos/logo-google.svg", alt: "Google", label: "Google" },
          { src: "/logos/logo-linkedin.svg", alt: "LinkedIn", label: "LinkedIn" },
          { src: "/logos/logo-microsoft.svg", alt: "Microsoft", label: "Microsoft" },
          { src: "/logos/logo-orcid.svg", alt: "ORCID", label: "ORCID" },
        ].map((provider) => (
          <Button
            key={provider.label}
            variant="outline"
            onClick={() => {
              const providerName = provider.label.toLowerCase();
              if (providerName === "google") {
                handleOAuthSignIn("google");
              } else if (providerName === "orcid") {
                handleOAuthSignIn("orcid");
              } else if (providerName === "microsoft") {
                handleOAuthSignIn("microsoft-entra-id");
              }
            }}
            disabled={areSocialsDisabled}
            className="relative h-9 w-full cursor-pointer overflow-hidden rounded px-5 py-2.5 text-white transition-all duration-500 hover:rounded-sm hover:bg-green-200 hover:ring-2 hover:ring-green-300 hover:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:h-10"
          >
            {/* Renders the social provider's logo. */}
            <Image
              src={provider.src}
              alt={provider.alt}
              width={18}
              height={18}
              className="relative md:h-5 md:w-5"
            />
          </Button>
        ))}
      </div>
    </>
  );
}

AuthSocialProvider.displayName = "AuthSocialProvider";
