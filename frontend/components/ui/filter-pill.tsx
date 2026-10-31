"use client";

import { ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

type Props = {
    label: string;
    options: FilterOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
};

export function FilterPill({ label, options, selected, onChange }: Props) {
    const isActive = selected.length > 0;

    const activeLabel = (() => {
        if (selected.length === 0) return label;
        if (selected.length >= 3) return `${label} (${selected.length})`;
        return selected
            .map((v) => options.find((o) => o.value === v)?.label ?? v)
            .join(" · ");
    })();

    function toggle(value: string) {
        onChange(
            selected.includes(value)
                ? selected.filter((v) => v !== value)
                : [...selected, value],
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none",
                        isActive
                            ? "bg-foreground text-background hover:bg-foreground/90"
                            : "bg-subtle text-muted-foreground hover:bg-hover hover:text-foreground",
                    )}
                >
                    {activeLabel}
                    <ChevronDown className={cn("h-3 w-3 shrink-0", isActive ? "opacity-60" : "opacity-40")} />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="min-w-44">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    Filtrer par {label.toLowerCase()}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {options.map((opt) => {
                    const checked = selected.includes(opt.value);
                    return (
                        <DropdownMenuItem
                            key={opt.value}
                            onSelect={(e) => { e.preventDefault(); toggle(opt.value); }}
                            className={cn(
                                "gap-2.5 cursor-pointer",
                                checked ? "text-foreground" : "text-muted-foreground",
                            )}
                        >
                            {/* Carré custom — plein si coché, contour si non coché (multi-select) */}
                            {checked ? (
                                <span className="h-3.5 w-3.5 shrink-0 rounded-none bg-foreground" />
                            ) : (
                                <span className="h-3.5 w-3.5 shrink-0 rounded-none border border-border/60 bg-background" />
                            )}
                            <span className={cn("text-sm", checked && "font-medium")}>
                                {opt.label}
                            </span>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
