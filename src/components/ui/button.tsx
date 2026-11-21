import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] shadow-none hover:border-[var(--accent-hover)] hover:bg-[var(--accent-hover)]",
  secondary:
    "border border-[var(--line-strong)] bg-[var(--paper-hi)] text-[var(--ink)] shadow-none hover:border-[var(--ink)] hover:bg-[var(--wash-1)]",
  ghost: "border border-transparent text-[var(--ink)] hover:border-[var(--line)] hover:bg-[var(--wash-2)]",
  danger: "border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-ink)] shadow-none hover:border-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_16%,var(--paper-hi))]"
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
          "focus-ring inline-flex min-w-0 max-w-full items-center justify-center gap-2 whitespace-normal rounded-[var(--radius-sm)] text-center font-semibold leading-tight transition duration-150 disabled:pointer-events-none disabled:opacity-45",
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
