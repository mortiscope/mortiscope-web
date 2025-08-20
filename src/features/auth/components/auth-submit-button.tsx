import { Button } from "@/components/ui/button";

/**
 * Defines the props for the authentication submit button component.
 */
interface AuthSubmitButtonProps {
  /** A boolean to disable the button, typically based on form validity or other conditions. */
  isDisabled?: boolean;
  /** A boolean to indicate a pending state, which displays the `pendingText`. */
  isPending?: boolean;
  /** The default content to display inside the button when not in a pending state. */
  children: React.ReactNode;
  /** Optional text to display when `isPending` is true. @default "Loading..." */
  pendingText?: string;
  /** The button's type attribute. @default "submit" */
  type?: "submit" | "button";
  /** An optional click handler, useful if the button `type` is "button". */
  onClick?: () => void;
  /** When true, the button acts as a wrapper for child elements like Link components. */
  asChild?: boolean;
}

/**
 * A reusable, styled submit button designed for authentication forms.
 * @param {AuthSubmitButtonProps} props The props for the component.
 * @returns A React component representing the styled submit button.
 */
export function AuthSubmitButton({
  isDisabled = false,
  isPending = false,
  children,
  pendingText,
  type = "submit",
  onClick,
  asChild = false,
}: AuthSubmitButtonProps) {
  // For asChild pattern
  if (asChild) {
    return (
      <Button
        asChild
        className="font-inter relative h-9 w-full cursor-pointer overflow-hidden rounded-lg border-none bg-green-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:h-10 md:text-base"
      >
        {children}
      </Button>
    );
  }

  return (
    /* Wrapper to apply disabled cursor style to the button */
    <div className={`inline-block w-full ${isDisabled ? "cursor-not-allowed" : ""}`}>
      <Button
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        className={`font-inter relative mt-2 h-9 w-full overflow-hidden rounded-lg border-none bg-green-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out md:mt-0 md:h-10 md:text-base ${
          isDisabled
            ? "opacity-60"
            : "cursor-pointer before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0"
        }`}
      >
        {/* Conditionally renders the pending text or the default children based on the `isPending` state. */}
        {isPending ? pendingText || "Loading..." : children}
      </Button>
    </div>
  );
}

AuthSubmitButton.displayName = "AuthSubmitButton";
