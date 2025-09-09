"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface NavigationBarProps {
  animated?: boolean;
}

export function NavigationBar({ animated = false }: NavigationBarProps) {
  // A container variant for staggering the animation of navigation bar elements
  const navStaggerContainer: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: 2.2,
        staggerChildren: 0.2,
      },
    },
  };

  // A reusable variant for animating elements sliding in from the top
  const slideInFromTop: Variants = {
    hidden: { y: -30, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  const NavContent = () => (
    <>
      <motion.div className="flex items-center" variants={animated ? slideInFromTop : undefined}>
        <Link href="/" className="flex cursor-pointer items-center">
          <Image src="/logos/logo.svg" alt="Mortiscope Logo" width={50} height={50} priority />
          {/* Site title */}
          <span className="font-plus-jakarta-sans ml-2 text-2xl font-semibold tracking-tight md:text-3xl">
            <span className="text-green-800">MORTI</span>
            <span className="text-slate-800">SCOPE</span>
            <span className="text-amber-400">.</span>
          </span>
        </Link>
      </motion.div>
      <motion.div
        className="hidden items-center md:flex md:space-x-6 lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:space-x-10"
        variants={animated ? slideInFromTop : undefined}
      >
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
      </motion.div>
      <motion.div variants={animated ? slideInFromTop : undefined}>
        <Link href="/signin">
          <button className="font-inter relative cursor-pointer overflow-hidden rounded-full border border-slate-900 bg-transparent px-4 py-1.5 text-sm font-normal text-slate-900 uppercase transition-all duration-500 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-full before:bg-gradient-to-r before:from-slate-900 before:to-slate-800 before:transition-all before:duration-500 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-transparent hover:text-white hover:before:left-0 md:border-2 md:px-5 md:py-2 md:text-base lg:px-6 lg:text-lg">
            Sign In
          </button>
        </Link>
      </motion.div>
    </>
  );

  if (animated) {
    return (
      <div className="w-full">
        <motion.nav
          className="relative container mx-auto flex items-center justify-between px-4 py-6 sm:px-6 lg:px-6 2xl:px-32"
          variants={navStaggerContainer}
          initial="hidden"
          animate="show"
        >
          <NavContent />
        </motion.nav>
      </div>
    );
  }

  return (
    <div className="w-full">
      <nav className="relative container mx-auto flex items-center justify-between px-4 py-6 sm:px-6 lg:px-6 2xl:px-32">
        <Link href="/" className="flex cursor-pointer items-center">
          <Image src="/logos/logo.svg" alt="Mortiscope Logo" width={50} height={50} priority />
          {/* Site title */}
          <span className="font-plus-jakarta-sans ml-2 text-2xl font-semibold tracking-tight md:text-3xl">
            <span className="text-green-800">MORTI</span>
            <span className="text-slate-800">SCOPE</span>
            <span className="text-amber-400">.</span>
          </span>
        </Link>
        <div className="hidden items-center md:flex md:space-x-6 lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:space-x-10">
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
        <div>
          <Link href="/signin">
            <button className="font-inter relative cursor-pointer overflow-hidden rounded-full border border-slate-900 bg-transparent px-4 py-1.5 text-sm font-normal text-slate-900 uppercase transition-all duration-500 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-full before:bg-gradient-to-r before:from-slate-900 before:to-slate-800 before:transition-all before:duration-500 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-transparent hover:text-white hover:before:left-0 md:border-2 md:px-5 md:py-2 md:text-base lg:px-6 lg:text-lg">
              Sign In
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
}

NavigationBar.displayName = "NavigationBar";
