"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Home, Menu } from "lucide-react";

type RouteEntry = { pattern: RegExp; label: string; parent?: string; parentHref?: string };

// Les routes les plus spécifiques doivent venir en premier
const ROUTE_LABELS: RouteEntry[] = [
    { pattern: /\/admin\/utils\/trade-category/, label: "Catégories de métiers", parent: "Utilitaires", parentHref: "/admin/utils" },
    { pattern: /\/admin\/utils\/plans/, label: "Plans d'abonnement", parent: "Utilitaires", parentHref: "/admin/utils" },
    { pattern: /\/admin\/utils/, label: "Utilitaires" },
    { pattern: /\/admin\/users/, label: "Utilisateurs" },
];

export default function AdminSiteHeader() {
    const pathname = usePathname();
    const { toggleSidebar } = useSidebar();
    const match = ROUTE_LABELS.find((r) => r.pattern.test(pathname));

    return (
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
            {/* Mobile : hamburger */}
            <button
                onClick={toggleSidebar}
                className="md:hidden flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground transition-colors -ml-1"
                aria-label="Menu"
            >
                <Menu className="h-4 w-4" />
            </button>

            {/* Desktop : retour app */}
            <Link
                href="/app"
                className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground transition-colors -ml-1"
                aria-label="Retour à l'application"
            >
                <Home className="h-4 w-4" />
            </Link>

            {match && (
                <>
                    <Separator orientation="vertical" className="h-4" />
                    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <span>Admin</span>
                        {match.parent && (
                            <>
                                <span className="text-border">/</span>
                                <Link href={match.parentHref!} className="hover:text-foreground transition-colors">
                                    {match.parent}
                                </Link>
                            </>
                        )}
                        <span className="text-border">/</span>
                        <span className="font-medium text-foreground">{match.label}</span>
                    </nav>
                </>
            )}
        </header>
    );
}
