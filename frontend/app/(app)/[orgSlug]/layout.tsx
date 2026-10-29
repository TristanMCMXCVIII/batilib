import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/layout/app-sidebar";
import SiteHeader from "@/components/layout/site-header";
import { getUserOrgs } from "@/lib/actions/organization";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ActiveProjectProvider } from "@/lib/context/active-project";

type Props = {
    children: React.ReactNode;
    params: Promise<{ orgSlug: string }>;
};

export default async function OrgLayout({ children, params }: Props) {
    const { orgSlug } = await params;
    const session = await getSession();

    if (!session) redirect("/login");
    if (!session.user.emailVerified) {
        redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
    }

    const result = await db.query<{ id: string }>(
        `SELECT om.id FROM "OrganizationMembership" om
         JOIN "Organization" o ON o.id = om."organizationId"
         WHERE o.slug = $1 AND om."userId" = $2 AND om.status = 'ACTIVE'
         LIMIT 1`,
        [orgSlug, session.user.id],
    );

    if (!result.rows.length) redirect("/onboarding?context=kicked");

    const orgs = await getUserOrgs();

    return (
        <ActiveProjectProvider>
            <SidebarProvider className="h-screen overflow-hidden">
                <AppSidebar user={session.user} orgs={orgs} />
                <SidebarInset className="flex flex-col h-full md:ml-[var(--sidebar-width)]">
                    <SiteHeader />
                    <div className="flex-1 overflow-auto">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </ActiveProjectProvider>
    );
}
