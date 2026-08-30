import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border border-[color-mix(in_srgb,var(--seal)_58%,var(--line))] bg-[color-mix(in_srgb,var(--seal)_7%,var(--paper-hi))] text-[var(--seal)] shadow-paper-sm hover:border-[var(--seal)] hover:bg-[color-mix(in_srgb,var(--seal)_11%,var(--paper-hi))]",
  secondary:
    "border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-hi)_76%,transparent)] text-[var(--ink)] shadow-paper-sm hover:border-[var(--ink-mute)] hover:bg-[var(--wash-2)]",
  ghost: "border border-transparent text-[var(--ink)] hover:border-[var(--line)] hover:bg-[var(--wash-2)]",
  danger: "border border-[color-mix(in_srgb,var(--seal)_64%,var(--line))] bg-[var(--seal-soft)] text-[var(--cinnabar)] shadow-paper-sm hover:border-[var(--seal)]"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm",
  md: "min-h-11 px-4",
  lg: "min-h-12 px-5 text-base",
  icon: "h-11 w-11 p-0"
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "focus-ring inline-flex min-w-0 max-w-full items-center justify-center gap-2 whitespace-normal rounded-[var(--radius)] text-center font-bold leading-tight transition duration-150 disabled:pointer-events-none disabled:opacity-45",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
