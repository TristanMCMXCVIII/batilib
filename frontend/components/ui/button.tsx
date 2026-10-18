import { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "outline" | "ghost";
};

export default function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
    return (
        <button
            className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
                variant === "primary" && "bg-neutral-900 text-white hover:bg-neutral-800",
                variant === "outline" && "border border-neutral-300 text-neutral-800 hover:bg-neutral-50",
                variant === "ghost" && "text-neutral-600 hover:text-neutral-900",
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}
