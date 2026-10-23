import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/layout/app-sidebar";
import { getUserPrimaryOrgId } from "@/lib/actions/organization";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) redirect("/login");
    if (!session.user.emailVerified) {
        redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
    }

    const orgId = await getUserPrimaryOrgId();

    return (
        <div className="flex h-screen overflow-hidden">
            <AppSidebar user={session.user} orgId={orgId} />
            <main className="flex-1 overflow-auto bg-background">
                {children}
            </main>
        </div>
    );
}
