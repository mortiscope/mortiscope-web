"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { PiEye, PiEyeSlash } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SignUpPage() {
  // State to manage password visibility (show/hide)
  const [showPassword, setShowPassword] = useState(false);
  // State to manage confirm password visibility (show/hide)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Function to toggle the password visibility state
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Function to toggle the confirm password visibility state
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    // Main container for the sign-up form
    <div className="flex w-full flex-col items-center justify-center space-y-4 px-4 py-6 md:space-y-5 md:px-0 md:py-0">
      {/* Logo section, links to homepage */}
      <div className="mb-1 flex flex-col items-center md:mb-2">
        <Link href="/" aria-label="Go to homepage">
          <div className="flex cursor-pointer items-center">
            <Image
              src="/logo.svg"
              alt="Mortiscope Logo"
              width={60}
              height={60}
              className="md:h-[80px] md:w-[80px]"
            />
          </div>
        </Link>
      </div>
      {/* Heading and Description for the sign-up page */}
      <div className="text-center">
        <h1 className="font-plus-jakarta-sans text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Create an account
        </h1>
        <p className="font-inter mt-1 text-sm text-slate-600 md:mt-2">
          Get started by filling the information fields below.
        </p>
      </div>
      {/* Sign-up form */}
      <form className="font-inter mt-4 w-full space-y-2 md:space-y-4">
        {/* Name input fields */}
        <div className="flex w-full flex-col gap-4 md:flex-row md:gap-6">
          {/* First Name input field */}
          <div className="grid w-full items-center gap-1.5 md:w-1/2">
            <Label htmlFor="firstName" className="text-sm font-normal">
              First Name
            </Label>
            <Input
              type="text"
              id="firstName"
              placeholder="Enter your first name"
              className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
            />
          </div>
          {/* Last Name input field */}
          <div className="grid w-full items-center gap-1.5 md:w-1/2">
            <Label htmlFor="lastName" className="text-sm font-normal">
              Last Name
            </Label>
            <Input
              type="text"
              id="lastName"
              placeholder="Enter your last name"
              className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
            />
          </div>
        </div>
        {/* Email input field */}
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="email" className="text-sm font-normal">
            Email
          </Label>
          <Input
            type="email"
            id="email"
            placeholder="Enter your email"
            className="h-9 border-2 border-slate-200 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
          />
        </div>
        {/* Password input field with visibility toggle */}
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="password" className="text-sm font-normal">
            Password
          </Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Enter your password"
              className="h-9 border-2 border-slate-200 pr-10 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
            />
            {/* Button to toggle password visibility */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 transform cursor-pointer text-slate-500 hover:bg-transparent hover:text-slate-700 md:right-2"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <PiEye size={18} className="md:h-5 md:w-5" />
              ) : (
                <PiEyeSlash size={18} className="md:h-5 md:w-5" />
              )}
            </Button>
          </div>
        </div>
        {/* Confirm Password input field with visibility toggle */}
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="confirmPassword" className="text-sm font-normal">
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              placeholder="Confirm your password"
              className="h-9 border-2 border-slate-200 pr-10 text-sm placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 transform cursor-pointer text-slate-500 hover:bg-transparent hover:text-slate-700 md:right-2"
              onClick={toggleConfirmPasswordVisibility}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {/* Conditional icon rendering */}
              {showConfirmPassword ? (
                <PiEye size={18} className="md:h-5 md:w-5" />
              ) : (
                <PiEyeSlash size={18} className="md:h-5 md:w-5" />
              )}
            </Button>
          </div>
        </div>
        {/* Sign Up Button */}
        <Button
          type="submit"
          className="font-inter relative mt-2 h-9 w-full cursor-pointer overflow-hidden rounded-lg border-none bg-green-600 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:mt-0 md:h-10 md:text-base"
        >
          Sign Up
        </Button>
      </form>
      {/* Separator with text in the middle */}
      <div className="relative w-full pt-2 md:pt-0">
        <Separator />
        <span className="font-inter absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform bg-white px-2 text-xs text-slate-500">
          Or sign up with
        </span>
      </div>
      {/* Social Login Buttons section */}
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
        {/* Array of social providers, mapped to create buttons */}
        {[
          { src: "/logo-google.svg", alt: "Google", label: "Google" },
          { src: "/logo-linkedin.svg", alt: "LinkedIn", label: "LinkedIn" },
          { src: "/logo-microsoft.svg", alt: "Microsoft", label: "Microsoft" },
          { src: "/logo-orcid.svg", alt: "ORCID", label: "ORCID" },
        ].map((provider) => (
          <Button
            key={provider.label}
            variant="outline"
            className="relative h-9 w-full cursor-pointer overflow-hidden rounded px-5 py-2.5 text-white transition-all duration-500 hover:rounded-sm hover:bg-green-200 hover:ring-2 hover:ring-green-300 hover:ring-offset-2 md:h-10"
          >
            {/* Social provider logos */}
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
      {/* Link to Sign In page for existing users */}
      <p className="font-inter pt-2 text-center text-xs text-slate-600 md:pt-0 md:text-sm">
        Already have an account?&nbsp;
        <Link
          href="/signin"
          className="relative font-medium text-green-700 after:absolute after:-bottom-1 after:left-0 after:h-[1.5px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-green-600 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.65_0.05_0.36_1)] hover:text-green-600 hover:after:origin-bottom-left hover:after:scale-x-100"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
