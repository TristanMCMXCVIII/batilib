"use client";

import { useSearchParams } from "next/navigation";

export default function AuthErrorPage() {
    const searchParams = useSearchParams();

    const error =
        searchParams.get("error") ??
        searchParams.get("error_code") ??
        "unknown";

    const isAccountNotLinked = error === "account_not_linked";

    return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-semibold text-neutral-900">
                    {isAccountNotLinked
                        ? "Un compte existe déjà"
                        : "Impossible de vous connecter"}
                </h1>

                <p className="mt-3 text-sm leading-6 text-neutral-500">
                    {isAccountNotLinked
                        ? "Cette adresse email est déjà associée à un compte Batilib qui n’a pas encore été vérifié. Vérifiez d’abord votre adresse ou connectez-vous avec votre mot de passe."
                        : "Une erreur est survenue pendant la connexion. Vous pouvez réessayer."}
                </p>

                <div className="mt-6 space-y-3">
                    {isAccountNotLinked && (
                        <a
                            href="/auth/verify-existing-account"
                            className="block w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-neutral-800"
                        >
                            Vérifier mon email
                        </a>
                    )}

                    <a
                        href="/login"
                        className="block w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                    >
                        Se connecter avec un mot de passe
                    </a>
                </div>
            </div>
        </main>
    );
}