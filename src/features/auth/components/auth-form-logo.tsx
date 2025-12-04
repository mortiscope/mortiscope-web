import Image from "next/image";
import Link from "next/link";

/**
 * A reusable centered logo for authentication forms that navigates to the homepage.
 */
export function AuthFormLogo() {
  return (
    <div className="mb-2 flex justify-center md:mb-3">
      <Link href="/" aria-label="Go to homepage" className="inline-flex items-center justify-center">
        <Image
          src="/logos/logo.svg"
          alt="Mortiscope Logo"
          width={80}
          height={80}
          className="h-16 w-16 object-contain md:h-20 md:w-20"
          priority
        />
      </Link>
    </div>
  );
}

AuthFormLogo.displayName = "AuthFormLogo";
