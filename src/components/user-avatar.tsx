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

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const avatarSrc = user?.image ?? getDeterministicAvatar(user?.id);

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8 md:h-10 md:w-10",
    lg: "h-12 w-12 md:h-16 md:w-16",
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ""}`}>
      <AvatarImage
        src={imageError ? undefined : avatarSrc}
        alt={user?.name ?? "User Avatar"}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageError(true);
          setImageLoaded(true);
        }}
        className={`transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
      />
      <AvatarFallback className={imageLoaded && !imageError ? "opacity-0" : "opacity-100"}>
        {initials || "U"}
      </AvatarFallback>
    </Avatar>
  );
}

UserAvatar.displayName = "UserAvatar";
