"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function AppPage() {
    const router = useRouter();

    async function handleLogout() {
        await authClient.signOut();

        router.push("/login");
        router.refresh();
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
                            Votre espace
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100"
                    >
                        Se déconnecter
                    </button>
                </div>
            </div>
        </main>
    );
}