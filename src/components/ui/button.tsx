import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-[3px] border-[var(--border)] bg-[var(--yellow)] text-[#1a1a2e] shadow-[3px_3px_0_var(--shadow-color)] hover:-translate-x-px hover:-translate-y-px",
  secondary:
    "border-[3px] border-[var(--border)] bg-[var(--card)] text-[var(--ink)] shadow-[3px_3px_0_var(--shadow-color)] hover:bg-[var(--yellow-soft)]",
  ghost: "border-[3px] border-transparent text-[var(--ink)] hover:border-[var(--border)] hover:bg-[var(--card)]",
  danger: "border-[3px] border-[var(--border)] bg-[var(--red)] text-white shadow-[3px_3px_0_var(--shadow-color)] hover:-translate-x-px hover:-translate-y-px"
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
          "focus-ring inline-flex min-w-0 max-w-full items-center justify-center gap-2 whitespace-normal rounded-none text-center font-extrabold leading-tight transition duration-150 disabled:pointer-events-none disabled:opacity-45",
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
