import React from "react";

const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(" ");

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors: string[];
  animationSpeed?: number;
}

export const GradientText = ({
  children,
  className,
  colors,
  animationSpeed = 8,
}: GradientTextProps) => {
  const gradientStyle = {
    "--animation-speed": `${animationSpeed}s`,
    backgroundImage: `linear-gradient(to right, ${colors.join(", ")})`,
  } as React.CSSProperties;

  return (
    <span
      className={cn("animate-gradient bg-clip-text text-transparent", className)}
      style={gradientStyle}
    >
      {children}
    </span>
  );
};
