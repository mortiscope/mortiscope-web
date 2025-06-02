"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef } from "react";
import BeatLoader from "react-spinners/BeatLoader";

import { CustomCursor } from "@/components/custom-cursor";
import { Button } from "@/components/ui/button";

const NotFoundPage = () => {
  // Create a ref for the section element
  const notFoundSectionRef = useRef<HTMLElement>(null);

  // Initializes the router for navigation
  const router = useRouter();
  // Retrieves the current authentication session status
  const { status } = useSession();

  // Derived state to determine if the user is authenticated or if the session is loading
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  // Dynamically sets the button text and navigation path based on authentication status
  const buttonText = isAuthenticated ? "Back to Dashboard" : "Back to Home";
  const targetPath = isAuthenticated ? "/dashboard" : "/";

  // Navigates the user to the appropriate page when the button is clicked
  const handleReturn = () => {
    router.push(targetPath);
  };

  return (
    <>
      {/* Main section container, now with the ref attached */}
      <section
        ref={notFoundSectionRef}
        className="flex min-h-screen w-full items-center justify-center overflow-hidden bg-[url('/images/painting-texture-overlay.png')] bg-cover bg-center bg-no-repeat p-4"
        aria-label="Page Not Found"
      >
        {/* Relative container to position the background fly image */}
        <div className="relative flex items-center justify-center">
          {/* Decorative background image, positioned absolutely behind the main content. */}
          <Image
            src="/images/chrysomya-megacephala.png"
            alt="Chrysomya Megacephala fly"
            width={698}
            height={465}
            className="absolute top-1/2 left-1/2 z-0 h-auto w-80 -translate-x-1/2 -translate-y-1/2 opacity-20 md:w-96 lg:w-[32rem] xl:w-[40rem]"
            priority
          />

          {/* Main content wrapper, stacked on top of the background image. */}
          <div className="relative z-10 flex flex-col items-center justify-center space-y-6 text-center md:space-y-8">
            {/* Logo with Title for brand consistency */}
            <div className="flex items-center">
              <Image src="/logos/logo.svg" alt="Mortiscope Logo" width={60} height={60} />
              <span className="font-inter ml-3 text-3xl font-bold tracking-tighter md:text-4xl">
                <span className="text-green-800">MORTI</span>
                <span className="text-slate-800">SCOPE</span>
                <span className="text-amber-400">.</span>
              </span>
            </div>

            {/* 404 Heading */}
            <h1 className="font-plus-jakarta-sans cursor-text text-5xl font-black uppercase lg:text-7xl">
              <span className="text-green-800">Page Not Found</span>
            </h1>

            {/* Helper Description */}
            <p className="font-inter max-w-xl text-base leading-relaxed text-slate-900 md:text-lg lg:text-xl">
              Oops! It seems you&apos;ve wandered into uncharted territory. The page you are looking
              for does not exist or has been moved.
            </p>

            {/* Call-to-Action Button */}
            <div>
              <Button
                onClick={handleReturn}
                disabled={isLoading}
                className="font-inter relative cursor-pointer overflow-hidden rounded-lg border-none bg-yellow-500 px-4 py-4 text-sm font-normal text-white uppercase transition-all duration-200 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-green-700 before:to-green-600 before:transition-all before:duration-500 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-amber-500 hover:text-white hover:before:left-0 disabled:cursor-not-allowed disabled:opacity-70 md:px-5 md:py-5 md:text-base lg:px-6 lg:py-6 lg:text-lg"
              >
                {/* Shows a loader while the session is being determined. */}
                {isLoading ? (
                  <BeatLoader
                    color="#ffffff"
                    loading={isLoading}
                    size={10}
                    aria-label="Loading..."
                  />
                ) : (
                  buttonText
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Cursor component, active within the notFoundSectionRef area */}
      <CustomCursor
        containerRef={notFoundSectionRef}
        iconSrc="/icons/icon-access-denied.svg"
        iconSize={32}
        className="h-18 w-18 bg-slate-800 shadow-xl"
        iconClassName="brightness-0 invert"
      />
    </>
  );
};

export default NotFoundPage;
