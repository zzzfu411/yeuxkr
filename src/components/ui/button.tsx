import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--ink)] text-[var(--surface-solid)] shadow-paper-sm hover:-translate-y-0.5 hover:shadow-editorial",
  secondary:
    "border border-[var(--line-strong)] bg-[rgba(255,250,240,0.72)] text-[var(--ink)] hover:-translate-y-0.5 hover:bg-[var(--surface-solid)]",
  ghost: "text-[var(--ink)] hover:bg-[rgba(24,28,27,0.06)]",
  danger: "bg-[var(--cinnabar)] text-white hover:-translate-y-0.5"
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
          "focus-ring inline-flex min-w-0 max-w-full items-center justify-center gap-2 whitespace-normal rounded-[8px] text-center font-extrabold leading-tight transition duration-200 disabled:pointer-events-none disabled:opacity-45",
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
