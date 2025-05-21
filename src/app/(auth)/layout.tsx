import Image from "next/image";
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // Main container for the layout
    <main className="flex h-screen w-screen overflow-hidden">
      {/* Left-side panel */}
      <div className="relative hidden h-full w-1/2 md:block">
        <Image
          src="/auth-image.jpg"
          alt="Chrysomya Megacephala fly on a leaf"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="absolute inset-0 z-0 object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-green-900 to-transparent" />
      </div>

      {/* Right-side panel */}
      <div className="flex w-full items-center justify-center overflow-y-auto p-6 md:w-1/2 md:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
