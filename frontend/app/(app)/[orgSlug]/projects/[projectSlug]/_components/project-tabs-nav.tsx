"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { label: string; href: string; exact?: boolean };

export default function ProjectTabsNav({ tabs }: { tabs: Tab[] }) {
    const pathname = usePathname();

    return (
        <nav className="flex gap-0.5">
            {tabs.map((tab) => {
                const isActive = tab.exact
                    ? pathname === tab.href
                    : pathname === tab.href || pathname.startsWith(tab.href + "/");
                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
                            isActive
                                ? "border-foreground text-foreground font-medium"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
