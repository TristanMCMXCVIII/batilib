import { InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...props }: InputProps) {
    return (
        <input
            className={cn(
                "w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900",
                className,
            )}
            {...props}
        />
    );
}
