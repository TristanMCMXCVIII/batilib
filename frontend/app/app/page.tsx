import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/auth/logout-button";

export default async function AppPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    if (!session.user.emailVerified) {
        redirect(
            `/verify-email?email=${encodeURIComponent(session.user.email)}`
        );
    }

    return (
        <main className="min-h-screen bg-neutral-50 p-8">
            <div className="mx-auto max-w-5xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-neutral-900">
                            Batilib
                        </h1>

                        <p className="mt-1 text-sm text-neutral-500">
                            Bonjour {session.user.name}
                        </p>
                    </div>

                    <LogoutButton />
                </div>
            </div>
        </main>
    );
}