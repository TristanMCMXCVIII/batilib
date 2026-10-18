import { cn } from "@/utils/cn";

type CardProps = {
    className?: string;
    children: React.ReactNode;
};

export default function Card({ className, children }: CardProps) {
    return (
        <div className={cn("rounded-2xl border border-neutral-200 bg-white", className)}>
            {children}
        </div>
    );
}
