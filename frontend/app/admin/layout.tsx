import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/layout/admin-sidebar";
import AdminSiteHeader from "@/components/layout/admin-site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) redirect("/login");
    if (!session.user.emailVerified) {
        redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
    }
    if (session.user.role !== "admin") redirect("/app");

    return (
        <SidebarProvider className="h-screen overflow-hidden">
            <AdminSidebar user={session.user} />
            <SidebarInset className="flex flex-col h-full md:ml-[var(--sidebar-width)]">
                <AdminSiteHeader />
                <div className="flex-1 overflow-auto">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
