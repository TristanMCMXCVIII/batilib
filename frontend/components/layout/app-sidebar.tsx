"use client";

import { useEffect } from "react";
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
    useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
    ArrowLeft,
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
    Pencil,
    Plus,
    TrendingUp,
    User,
    Users,
} from "lucide-react";
import type { OrgInfo } from "@/lib/actions/organization";
import { useActiveProject, type ProjectParticipantRole } from "@/lib/context/active-project";

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

const PARTICIPANT_ROLE_LABELS: Partial<Record<ProjectParticipantRole, string>> = {
    CLIENT:        "Client",
    SUBCONTRACTOR: "Sous-traitant",
};

function getProjectNavItems(
    orgSlug: string,
    projectSlug: string,
    role: ProjectParticipantRole,
) {
    const base = `/${orgSlug}/projects/${projectSlug}`;

    switch (role) {
        case "CLIENT":
            return [
                { label: "Chantier",     href: `${base}/chantier`,  icon: Pencil,     exact: false },
                { label: "Intervenants", href: `${base}/members`,   icon: Users,      exact: false },
                { label: "Documents",    href: `${base}/documents`, icon: FileText,   exact: false },
            ];
        case "SUBCONTRACTOR":
            return [
                { label: "Mes lots",     href: `${base}/chantier`,  icon: Pencil,     exact: false },
                { label: "Intervenants", href: `${base}/members`,   icon: Users,      exact: false },
                { label: "Documents",    href: `${base}/documents`, icon: FileText,   exact: false },
            ];
        default: // LEAD
            return [
                { label: "Chantier",     href: `${base}/chantier`,  icon: Pencil,     exact: false },
                { label: "Intervenants", href: `${base}/members`,   icon: Users,      exact: false },
                { label: "Documents",    href: `${base}/documents`, icon: FileText,   exact: false },
                { label: "Économie",     href: `${base}/economics`, icon: TrendingUp, exact: false },
            ];
    }
}

export default function AppSidebar({ user, orgs }: { user: UserInfo; orgs: OrgInfo[] }) {
    const pathname = usePathname();
    const params = useParams();
    const router = useRouter();
    const { setOpenMobile } = useSidebar();
    const { activeProject } = useActiveProject();

    useEffect(() => {
        setOpenMobile(false);
    }, [pathname, setOpenMobile]);

    const currentOrgSlug = typeof params.orgSlug === "string" ? params.orgSlug : null;
    const currentOrg = orgs.find((o) => o.orgSlug === currentOrgSlug) ?? orgs[0] ?? null;

    async function handleSignOut() {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
    }

    const isMyOrgActive = pathname.includes("/my-organization");

    return (
        <Sidebar collapsible="offcanvas" className="border-r border-sidebar-border">
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
                                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-subtle border border-border shrink-0 overflow-hidden">
                                        {currentOrg?.orgLogoUrl ? (
                                            <img
                                                src={currentOrg.orgLogoUrl}
                                                alt={currentOrg.orgName}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-sm font-semibold text-foreground select-none">
                                                {(currentOrg?.orgName ?? "B").charAt(0).toUpperCase()}
                                            </span>
                                        )}
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
                                        key={org.orgSlug}
                                        asChild
                                        className="cursor-pointer"
                                    >
                                        <Link href={`/${org.orgSlug}`}>
                                            <div className="flex size-6 items-center justify-center rounded-md border bg-subtle shrink-0 overflow-hidden">
                                                {org.orgLogoUrl ? (
                                                    <img
                                                        src={org.orgLogoUrl}
                                                        alt={org.orgName}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-xs font-semibold text-muted-foreground select-none">
                                                        {org.orgName.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid flex-1 text-sm leading-tight">
                                                <span className="truncate font-medium">{org.orgName}</span>
                                                <span className="truncate text-xs text-muted-foreground">
                                                    {ORG_KIND_LABELS[org.orgKind] ?? org.orgKind}
                                                </span>
                                            </div>
                                            {org.orgSlug === currentOrg?.orgSlug && (
                                                <span className="ml-auto text-xs text-muted-foreground">●</span>
                                            )}
                                        </Link>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild className="cursor-pointer">
                                    <Link href={currentOrg ? `/${currentOrg.orgSlug}/new-organization` : "/onboarding"}>
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
                        {activeProject ? (
                            /* ── Mode projet ──────────────────── */
                            <>
                                <SidebarGroup>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton asChild>
                                                    <Link href={`/${currentOrg.orgSlug}/projects`}>
                                                        <ArrowLeft />
                                                        <span>Projets</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>

                                <SidebarGroup>
                                    <SidebarGroupLabel className="flex items-center justify-between gap-2">
                                        <span className="truncate">{activeProject.name}</span>
                                        {PARTICIPANT_ROLE_LABELS[activeProject.participantRole] && (
                                            <span className="shrink-0 text-xs font-normal text-sidebar-foreground/50">
                                                {PARTICIPANT_ROLE_LABELS[activeProject.participantRole]}
                                            </span>
                                        )}
                                    </SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            {getProjectNavItems(currentOrg.orgSlug, activeProject.slug, activeProject.participantRole).map((item) => {
                                                const isActive = item.exact
                                                    ? pathname === item.href
                                                    : pathname === item.href || pathname.startsWith(item.href + "/");
                                                return (
                                                    <SidebarMenuItem key={item.href}>
                                                        <SidebarMenuButton asChild isActive={isActive}>
                                                            <Link href={item.href}>
                                                                <item.icon />
                                                                <span>{item.label}</span>
                                                            </Link>
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                );
                                            })}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                            </>
                        ) : (
                            /* ── Mode global ──────────────────── */
                            <>
                                <SidebarGroup>
                                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={pathname === `/${currentOrg.orgSlug}`}
                                                >
                                                    <Link href={`/${currentOrg.orgSlug}`}>
                                                        <Home />
                                                        <span>Accueil</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>

                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={pathname.startsWith(`/${currentOrg.orgSlug}/projects`)}
                                                >
                                                    <Link href={`/${currentOrg.orgSlug}/projects`}>
                                                        <FolderOpen />
                                                        <span>Projets</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>

                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={pathname.startsWith(`/${currentOrg.orgSlug}/economy`)}
                                                >
                                                    <Link href={`/${currentOrg.orgSlug}/economy`}>
                                                        <TrendingUp />
                                                        <span>Économie</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>

                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={pathname.startsWith(`/${currentOrg.orgSlug}/documents`)}
                                                >
                                                    <Link href={`/${currentOrg.orgSlug}/documents`}>
                                                        <FileText />
                                                        <span>Documents</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>

                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={pathname.startsWith(`/${currentOrg.orgSlug}/library`)}
                                                >
                                                    <Link href={`/${currentOrg.orgSlug}/library`}>
                                                        <BookOpen />
                                                        <span>Bibliothèque</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>

                                            {currentOrg.orgKind === "BUILDING_COMPANY" && (
                                                <SidebarMenuItem>
                                                    <SidebarMenuButton
                                                        asChild
                                                        isActive={pathname.startsWith(`/${currentOrg.orgSlug}/tenders`)}
                                                    >
                                                        <Link href={`/${currentOrg.orgSlug}/tenders`}>
                                                            <Megaphone />
                                                            <span>Appels à projet</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            )}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>

                                <SidebarGroup>
                                    <SidebarGroupLabel>Mon espace</SidebarGroupLabel>
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={pathname === `/${currentOrg?.orgSlug}/my-account`}
                                                >
                                                    <Link href={`/${currentOrg?.orgSlug}/my-account`}>
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
                                                                    `/${currentOrg.orgSlug}/my-organization/presentation`
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
                                                                        `/${currentOrg.orgSlug}/my-organization/presentation`
                                                                    )}
                                                                >
                                                                    <Link href={`/${currentOrg.orgSlug}/my-organization/presentation`}>
                                                                        <FileText className="size-3.5" />
                                                                        Présentation
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                            <SidebarMenuSubItem>
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    isActive={pathname.startsWith(
                                                                        `/${currentOrg.orgSlug}/my-organization/members`
                                                                    )}
                                                                >
                                                                    <Link href={`/${currentOrg.orgSlug}/my-organization/members`}>
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
                                                                            `/${currentOrg.orgSlug}/my-organization/billing`
                                                                        )}
                                                                    >
                                                                        <Link href={`/${currentOrg.orgSlug}/my-organization/billing`}>
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
                                <DropdownMenuItem asChild>
                                    <Link href={`/${currentOrg?.orgSlug}/my-account`} className="cursor-pointer">
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
