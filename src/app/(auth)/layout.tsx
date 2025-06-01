import Image from "next/image";
import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // Main container for the layout
    <main className="flex h-screen w-screen overflow-hidden">
      {/* Left-side panel */}
      <div className="relative hidden h-full w-1/2 md:block">
        <Image
          src="/images/auth-image.jpg"
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
      <div className="w-full overflow-y-auto md:w-1/2">
        <div className="flex min-h-full w-full items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </main>
  );
}
