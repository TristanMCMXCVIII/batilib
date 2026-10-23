import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/layout/app-sidebar";
import { getUserOrgs } from "@/lib/actions/organization";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) redirect("/login");
    if (!session.user.emailVerified) {
        redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
    }

    const orgs = await getUserOrgs();

    return (
        <SidebarProvider className="h-screen overflow-hidden">
            <AppSidebar user={session.user} orgs={orgs} />
            <SidebarInset className="overflow-auto">
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}
