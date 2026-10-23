"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronUp, User } from "lucide-react";

type User = {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
};

export default function AppSidebar({ user, orgId }: { user: User; orgId: string | null }) {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        ...(orgId ? [{ href: `/app/${orgId}`, label: "Accueil" }] : []),
        ...(orgId ? [{ href: `/app/${orgId}/organization`, label: "Mon organisation" }] : []),
        { href: "/profile", label: "Mon compte" },
    ];

    async function handleSignOut() {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
    }

    return (
        <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r border-border bg-subtle">
            <div className="flex h-14 items-center border-b border-border px-4">
                <span className="font-semibold text-foreground">Batilib</span>
            </div>

            <nav className="flex-1 space-y-0.5 p-3">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${pathname === item.href || pathname.startsWith(item.href + "/") ? "nav-item-active" : ""}`}
                    >
                        {item.label}
                    </Link>
                ))}

                {user.role === "admin" && (
                    <Link
                        href="/admin/users"
                        className={`nav-item ${pathname.startsWith("/admin") ? "nav-item-active" : ""}`}
                    >
                        Administration
                    </Link>
                )}
            </nav>

            <div className="border-t border-border p-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-hover focus-visible:outline-none">
                            <Avatar className="h-7 w-7 shrink-0">
                                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                                <AvatarFallback>
                                    <User className="h-4 w-4 text-muted-foreground" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent side="top" align="start" className="w-52">
                        <DropdownMenuLabel className="font-normal">
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {orgId && (
                            <DropdownMenuItem asChild>
                                <Link href={`/app/${orgId}`}>Accueil</Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                            <Link href="/profile">Mon compte</Link>
                        </DropdownMenuItem>
                        {user.role === "admin" && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/admin/users">Administration</Link>
                                </DropdownMenuItem>
                            </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleSignOut}
                            className="text-destructive focus:text-destructive"
                        >
                            Se déconnecter
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}
