import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AppSidebar from "@/components/layout/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) redirect("/login");
    if (!session.user.emailVerified) {
        redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <AppSidebar user={session.user} />
            <main className="flex-1 overflow-auto bg-neutral-50">
                {children}
            </main>
        </div>
    );
}
