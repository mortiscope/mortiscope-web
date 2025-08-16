"use client";

import React, { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDeterministicAvatar } from "@/lib/utils";

interface UserAvatarProps {
  user: {
    id?: string;
    name?: string | null;
    image?: string | null;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({ user, className, size = "md" }: UserAvatarProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const avatarSrc = user?.image ?? getDeterministicAvatar(user?.id);

  // Reset loading state when image source changes
  React.useEffect(() => {
    if (currentSrc !== avatarSrc) {
      setImageLoaded(false);
      setImageError(false);
      setCurrentSrc(avatarSrc);
    }
  }, [avatarSrc, currentSrc]);

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8 md:h-10 md:w-10",
    lg: "h-12 w-12 md:h-16 md:w-16",
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ""}`}>
      <AvatarImage
        key={currentSrc || avatarSrc}
        src={imageError ? getDeterministicAvatar(user?.id) : currentSrc || avatarSrc}
        alt={user?.name ?? "User Avatar"}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageError(true);
          setImageLoaded(true);
        }}
        className={`transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
      />
      <AvatarFallback className={imageLoaded && !imageError ? "opacity-0" : "opacity-10"}>
        {initials || "U"}
      </AvatarFallback>
    </Avatar>
  );
}

UserAvatar.displayName = "UserAvatar";
