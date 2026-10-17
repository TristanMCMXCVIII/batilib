import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    if (session.user.role !== "admin") {
        redirect("/app");
    }

    return (
        <main className="min-h-screen bg-neutral-50 p-8">
            <div className="mx-auto max-w-5xl">
                <h1 className="text-2xl font-semibold text-neutral-900">
                    Administration
                </h1>

                <p className="mt-2 text-sm text-neutral-500">
                    Espace réservé aux administrateurs Batilib.
                </p>
            </div>
        </main>
    );
}