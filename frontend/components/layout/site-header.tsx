"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Home, Menu } from "lucide-react";

type RouteEntry = { pattern: RegExp; label: string; parent?: string };

const ROUTE_LABELS: RouteEntry[] = [
    { pattern: /\/my-organization\/presentation/, label: "Présentation", parent: "Mon entreprise" },
    { pattern: /\/my-organization\/members/, label: "Membres", parent: "Mon entreprise" },
    { pattern: /\/my-organization\/billing/, label: "Facturation", parent: "Mon entreprise" },
    { pattern: /\/my-account/, label: "Mon profil" },
    { pattern: /\/projects/, label: "Projets" },
    { pattern: /\/economy/, label: "Économie" },
    { pattern: /\/documents/, label: "Documents" },
    { pattern: /\/library/, label: "Bibliothèque" },
    { pattern: /\/tenders/, label: "Appels à projet" },
];

export default function SiteHeader() {
    const pathname = usePathname();
    const params = useParams();
    const { toggleSidebar } = useSidebar();
    const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : null;
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

            {/* Desktop : icône maison */}
            {orgSlug && (
                <Link
                    href={`/${orgSlug}`}
                    className="hidden md:flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-hover hover:text-foreground transition-colors -ml-1"
                    aria-label="Accueil"
                >
                    <Home className="h-4 w-4" />
                </Link>
            )}

            {match && (
                <>
                    <Separator orientation="vertical" className="h-4" />
                    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        {match.parent && (
                            <>
                                <span>{match.parent}</span>
                                <span className="text-border">/</span>
                            </>
                        )}
                        <span className="font-medium text-foreground">{match.label}</span>
                    </nav>
                </>
            )}
        </header>
    );
}
