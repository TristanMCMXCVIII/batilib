"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, ChevronsUpDown, LogOut, Settings, User, Users } from "lucide-react";

type UserInfo = {
    id: string;
    name: string;
    email: string;
    image?: string | null;
};

const utilsSubItems = [
    { href: "/admin/utils/trade-category", label: "Catégories de métiers" },
    { href: "/admin/utils/plans", label: "Plans d'abonnement" },
];

export default function AdminSidebar({ user }: { user: UserInfo }) {
    const pathname = usePathname();
    const router = useRouter();

    const isUtilsActive = pathname.startsWith("/admin/utils");

    async function handleSignOut() {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
    }


    return (
        <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
            {/* ── Header : logo BATILIB + mention Admin ─── */}
            <SidebarHeader>
                <div className="flex items-center gap-2.5 px-2 py-2.5">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-foreground shrink-0">
                        <span className="text-sm font-bold text-background select-none">B</span>
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold text-sidebar-foreground">Batilib</span>
                        <span className="truncate text-xs text-sidebar-foreground/60">Administration</span>
                    </div>
                </div>
            </SidebarHeader>

            {/* ── Contenu : navigation ─────────────── */}
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Gestion</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {/* Utilisateurs */}
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.startsWith("/admin/users")}
                                >
                                    <Link href="/admin/users">
                                        <Users />
                                        <span>Utilisateurs</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            {/* Utilitaires (collapsible) */}
                            <Collapsible
                                asChild
                                defaultOpen={isUtilsActive}
                                className="group/collapsible"
                            >
                                <SidebarMenuItem>
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton isActive={isUtilsActive}>
                                            <Settings />
                                            <span>Utilitaires</span>
                                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                        <SidebarMenuSub>
                                            {utilsSubItems.map((sub) => (
                                                <SidebarMenuSubItem key={sub.href}>
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={pathname.startsWith(sub.href)}
                                                    >
                                                        <Link href={sub.href}>{sub.label}</Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </CollapsibleContent>
                                </SidebarMenuItem>
                            </Collapsible>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            {/* ── Footer : utilisateur ─────────────── */}
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="h-8 w-8 rounded-full shrink-0">
                                        <AvatarImage src={user.image ?? undefined} alt={user.name} />
                                        <AvatarFallback className="rounded-full bg-muted">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{user.name}</span>
                                        <span className="truncate text-xs">{user.email}</span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                side="top"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleSignOut}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Se déconnecter
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
