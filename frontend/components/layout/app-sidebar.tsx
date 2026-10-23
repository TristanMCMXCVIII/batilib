"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
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
import {
    BookOpen,
    Building2,
    ChevronRight,
    ChevronsUpDown,
    CreditCard,
    FileText,
    FolderOpen,
    Home,
    LogOut,
    Megaphone,
    Plus,
    TrendingUp,
    User,
    Users,
} from "lucide-react";
import type { OrgInfo } from "@/lib/actions/organization";

type UserInfo = {
    id: string;
    name: string;
    email: string;
    image?: string | null;
};

const ORG_KIND_LABELS: Record<string, string> = {
    BUILDING_COMPANY: "Professionnel du bâtiment",
    CLIENT_COMPANY: "Entreprise cliente",
    INDIVIDUAL_CLIENT: "Particulier",
};

export default function AppSidebar({ user, orgs }: { user: UserInfo; orgs: OrgInfo[] }) {
    const pathname = usePathname();
    const params = useParams();
    const router = useRouter();

    const currentOrgId = typeof params.orgId === "string" ? params.orgId : null;
    const currentOrg = orgs.find((o) => o.orgId === currentOrgId) ?? orgs[0] ?? null;

    async function handleSignOut() {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
    }

    const isMyOrgActive = pathname.includes("/my-organization");

    return (
        <Sidebar collapsible="none" className="border-r border-sidebar-border">
            {/* ── Header : sélecteur d'organisation ─── */}
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                                        <Building2 className="size-4" />
                                    </div>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">
                                            {currentOrg?.orgName ?? "Batilib"}
                                        </span>
                                        <span className="truncate text-xs text-sidebar-foreground/60">
                                            {currentOrg
                                                ? (ORG_KIND_LABELS[currentOrg.orgKind] ?? currentOrg.orgKind)
                                                : "Plateforme"}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                                align="start"
                                side="bottom"
                                sideOffset={4}
                            >
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    Mes organisations
                                </DropdownMenuLabel>
                                {orgs.map((org) => (
                                    <DropdownMenuItem
                                        key={org.orgId}
                                        asChild
                                        className="cursor-pointer"
                                    >
                                        <Link href={`/app/${org.orgId}`}>
                                            <div className="flex size-6 items-center justify-center rounded-md border bg-subtle shrink-0">
                                                <Building2 className="size-3.5 text-muted-foreground" />
                                            </div>
                                            <div className="grid flex-1 text-sm leading-tight">
                                                <span className="truncate font-medium">{org.orgName}</span>
                                                <span className="truncate text-xs text-muted-foreground">
                                                    {ORG_KIND_LABELS[org.orgKind] ?? org.orgKind}
                                                </span>
                                            </div>
                                            {org.orgId === currentOrg?.orgId && (
                                                <span className="ml-auto text-xs text-muted-foreground">●</span>
                                            )}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="cursor-pointer">
                                    <Link href="/app/new-organization">
                                        <Plus className="size-4 mr-2" />
                                        Nouvelle organisation
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* ── Contenu : navigation ─────────────── */}
            <SidebarContent>
                {currentOrg && (
                    <>
                        {/* Section Navigation */}
                        <SidebarGroup>
                            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === `/app/${currentOrg.orgId}`}
                                        >
                                            <Link href={`/app/${currentOrg.orgId}`}>
                                                <Home />
                                                <span>Accueil</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname.startsWith(`/app/${currentOrg.orgId}/projects`)}
                                        >
                                            <Link href={`/app/${currentOrg.orgId}/projects`}>
                                                <FolderOpen />
                                                <span>Projets</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname.startsWith(`/app/${currentOrg.orgId}/economy`)}
                                        >
                                            <Link href={`/app/${currentOrg.orgId}/economy`}>
                                                <TrendingUp />
                                                <span>Économie</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname.startsWith(`/app/${currentOrg.orgId}/documents`)}
                                        >
                                            <Link href={`/app/${currentOrg.orgId}/documents`}>
                                                <FileText />
                                                <span>Documents</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname.startsWith(`/app/${currentOrg.orgId}/library`)}
                                        >
                                            <Link href={`/app/${currentOrg.orgId}/library`}>
                                                <BookOpen />
                                                <span>Bibliothèque</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    {currentOrg.orgKind === "BUILDING_COMPANY" && (
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={pathname.startsWith(`/app/${currentOrg.orgId}/tenders`)}
                                            >
                                                <Link href={`/app/${currentOrg.orgId}/tenders`}>
                                                    <Megaphone />
                                                    <span>Appels à projet</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        {/* Section Mon espace */}
                        <SidebarGroup>
                            <SidebarGroupLabel>Mon espace</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === "/profile"}
                                        >
                                            <Link href="/profile">
                                                <User />
                                                <span>Mon profil</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    <Collapsible
                                        asChild
                                        defaultOpen={isMyOrgActive}
                                        className="group/collapsible"
                                    >
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton
                                                    isActive={isMyOrgActive}
                                                    onClick={() =>
                                                        router.push(
                                                            `/app/${currentOrg.orgId}/my-organization/presentation`
                                                        )
                                                    }
                                                >
                                                    <Building2 />
                                                    <span>Mon entreprise</span>
                                                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub>
                                                    <SidebarMenuSubItem>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={pathname.startsWith(
                                                                `/app/${currentOrg.orgId}/my-organization/presentation`
                                                            )}
                                                        >
                                                            <Link href={`/app/${currentOrg.orgId}/my-organization/presentation`}>
                                                                <FileText className="size-3.5" />
                                                                Présentation
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                    <SidebarMenuSubItem>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={pathname.startsWith(
                                                                `/app/${currentOrg.orgId}/my-organization/members`
                                                            )}
                                                        >
                                                            <Link href={`/app/${currentOrg.orgId}/my-organization/members`}>
                                                                <Users className="size-3.5" />
                                                                Membres
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                    {currentOrg.orgKind === "BUILDING_COMPANY" && (
                                                        <SidebarMenuSubItem>
                                                            <SidebarMenuSubButton
                                                                asChild
                                                                isActive={pathname.startsWith(
                                                                    `/app/${currentOrg.orgId}/my-organization/billing`
                                                                )}
                                                            >
                                                                <Link href={`/app/${currentOrg.orgId}/my-organization/billing`}>
                                                                    <CreditCard className="size-3.5" />
                                                                    Facturation
                                                                </Link>
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    )}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </>
                )}
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
                                    <Avatar className="h-8 w-8 rounded-lg shrink-0">
                                        <AvatarImage src={user.image ?? undefined} alt={user.name} />
                                        <AvatarFallback className="rounded-lg bg-muted">
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
                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="cursor-pointer">
                                        <User className="mr-2 h-4 w-4" />
                                        Mon profil
                                    </Link>
                                </DropdownMenuItem>
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
