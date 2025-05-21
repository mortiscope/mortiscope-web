import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { CustomCursor } from "@/components/custom-cursor";
import { Button } from "@/components/ui/button";

const Hero = () => {
  // Reference for the hero section, used by the custom cursor component
  const heroSectionRef = useRef<HTMLElement>(null);

  return (
    <>
      {/* Main hero section container */}
      <section
        ref={heroSectionRef}
        className="flex min-h-auto w-full flex-col overflow-hidden bg-[url('/background.png')] bg-cover bg-center bg-no-repeat"
        aria-label="Hero background image"
      >
        {/* Navigation bar wrapper */}
        <div className="w-full">
          {/* Navigation Bar */}
          <nav className="container mx-auto flex items-center justify-between px-4 py-6 sm:px-6 lg:px-6">
            {/* Logo with Title */}
            <div className="flex items-center">
              {/* Logo image */}
              <Image src="/logo.svg" alt="Mortiscope Logo" width={50} height={50} />
              {/* Site title */}
              <span className="font-inter ml-2 text-2xl font-bold tracking-tighter md:text-3xl">
                <span className="text-green-800">MORTI</span>
                <span className="text-slate-800">SCOPE</span>
                <span className="text-amber-400">.</span>
              </span>
            </div>

            {/* Navigation Links */}
            <div className="hidden items-center md:flex md:space-x-6 lg:space-x-10">
              {/* Home link */}
              <a className="font-inter relative cursor-pointer text-slate-900 uppercase after:absolute after:right-0 after:-bottom-1 after:left-0 after:h-[2px] after:w-full after:origin-bottom after:scale-x-0 after:bg-slate-800 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:after:origin-bottom hover:after:scale-x-100 md:text-base lg:text-lg xl:text-xl">
                Home
              </a>
              {/* Features link */}
              <a className="font-inter relative cursor-pointer text-slate-900 uppercase after:absolute after:right-0 after:-bottom-1 after:left-0 after:h-[2px] after:w-full after:origin-bottom after:scale-x-0 after:bg-slate-800 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:after:origin-bottom hover:after:scale-x-100 md:text-base lg:text-lg xl:text-xl">
                Features
              </a>
              {/* About link */}
              <a className="font-inter relative cursor-pointer text-slate-900 uppercase after:absolute after:right-0 after:-bottom-1 after:left-0 after:h-[2px] after:w-full after:origin-bottom after:scale-x-0 after:bg-slate-800 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:after:origin-bottom hover:after:scale-x-100 md:text-base lg:text-lg xl:text-xl">
                About
              </a>
            </div>

            {/* Sign In Button container */}
            <div>
              {/* Sign In button */}
              <Link href="/signin">
                <Button className="font-inter relative cursor-pointer overflow-hidden rounded-full border-2 border-slate-900 bg-transparent px-4 py-1.5 text-sm font-normal text-slate-900 uppercase transition-all duration-500 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-full before:bg-gradient-to-r before:from-slate-900 before:to-slate-800 before:transition-all before:duration-500 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-transparent hover:text-white hover:before:left-0 md:px-5 md:py-2 md:text-base lg:px-6 lg:text-lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </nav>
        </div>

        {/* Hero Content Area */}
        <div className="container mx-auto flex flex-grow items-center px-4 py-10 sm:px-6 lg:px-6">
          {/* Grid layout for hero content */}
          <div className="grid w-full grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
            {/* Left-side Content */}
            <div className="flex flex-col justify-center space-y-6 text-center md:space-y-8 md:text-left">
              {/* Hero Heading */}
              <h1 className="font-plus-jakarta-sans cursor-text text-5xl font-black uppercase lg:text-7xl">
                <span className="text-green-800">Insect </span>
                <span className="text-slate-900">
                  hold the <i>clues</i>
                </span>
                <span className="text-amber-400">.</span>
              </h1>
              {/* Hero Description */}
              <p className="font-inter text-base leading-relaxed text-slate-900 md:text-lg lg:text-xl">
                Mortiscope simplifies oriental latrine fly&apos;s growth analysis, reducing time
                spent on manual examination. As a supplemental forensic tool, it enhances accuracy
                and supports forensic scientists in estimating time of death efficiently.
              </p>
              {/* Hero Call-to-Action Button container */}
              <div>
                {/* Start Analysis button */}
                <Link href="/signup">
                  <Button className="font-inter relative cursor-pointer overflow-hidden rounded-lg border-none bg-yellow-500 px-4 py-4 text-sm font-normal text-white uppercase transition-all duration-200 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-green-700 before:to-green-600 before:transition-all before:duration-500 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-amber-500 hover:text-white hover:before:left-0 md:px-5 md:py-5 md:text-base lg:px-6 lg:py-6 lg:text-lg">
                    Start Analysis
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right-side Content */}
            <div className="relative order-last flex h-full min-h-[300px] items-end justify-center sm:min-h-[350px] md:order-none md:min-h-[400px] lg:min-h-[550px]">
              {/* Container for the hand image */}
              <div className="absolute bottom-[-95%] left-1/2 w-[145%] max-w-none -translate-x-1/2 sm:bottom-[-100%] sm:w-[155%] md:bottom-[-85%] md:w-[180%] lg:bottom-[-115%] lg:w-[180%]">
                {/* Hand image */}
                <div className="relative z-10 -rotate-12 transform md:-rotate-15">
                  <Image
                    src="/hand.png"
                    alt="Hand reaching out the fly"
                    width={1422}
                    height={1800}
                    className="h-auto w-full object-contain"
                    priority
                  />
                </div>

                {/* Container for the fly image */}
                <div className="absolute bottom-[80%] left-[55%] z-20 w-[45%] max-w-md -translate-x-1/2 sm:bottom-[55%] sm:w-[50%] md:bottom-[85%] md:w-[55%] lg:bottom-[85%] lg:w-[45%]">
                  {/* Fly image */}
                  <Image
                    src="/chrysomya_megacephala.png"
                    alt="Chrysomya Megacephala fly"
                    width={698}
                    height={465}
                    className="h-auto w-full object-contain"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Cursor component, active within the heroSectionRef area */}
      <CustomCursor
        containerRef={heroSectionRef}
        iconClassName="brightness-0 invert"
        iconSrc="/icon-fly.svg"
        iconSize={32}
        className="h-18 w-18 bg-slate-800 shadow-xl"
      />
    </>
  );
};

export default Hero;
