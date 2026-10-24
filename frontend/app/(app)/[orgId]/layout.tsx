import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/layout/app-sidebar";
import SiteHeader from "@/components/layout/site-header";
import { getUserOrgs } from "@/lib/actions/organization";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type Props = {
    children: React.ReactNode;
    params: Promise<{ orgId: string }>;
};

export default async function OrgLayout({ children, params }: Props) {
    const { orgId } = await params;
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user.emailVerified) {
        redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
    }

    const result = await db.query<{ id: string }>(
        `SELECT id FROM "OrganizationMembership"
         WHERE "organizationId" = $1 AND "userId" = $2 AND status = 'ACTIVE'
         LIMIT 1`,
        [orgId, session.user.id],
    );

    if (!result.rows.length) redirect("/onboarding?context=kicked");

    const orgs = await getUserOrgs();

    return (
        <SidebarProvider className="h-screen overflow-hidden">
            <AppSidebar user={session.user} orgs={orgs} />
            <SidebarInset className="flex flex-col h-full md:ml-[var(--sidebar-width)]">
                <SiteHeader />
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
