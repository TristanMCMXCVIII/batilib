"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setLoading(true);
        setError(null);

        const { error } = await authClient.signIn.email({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            setError(error.message ?? "Email ou mot de passe incorrect.");
            return;
        }

        router.push("/app");
        router.refresh();
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-neutral-900">
                        Se connecter à Batilib
                    </h1>

                    <p className="mt-2 text-sm text-neutral-500">
                        Accédez à votre espace.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-neutral-700">
                            Email
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
                            placeholder="vous@entreprise.fr"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-neutral-700">
                            Mot de passe
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                    >
                        {loading ? "Connexion..." : "Se connecter"}
                    </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-neutral-200" />
                    <span className="text-xs text-neutral-400">ou</span>
                    <div className="h-px flex-1 bg-neutral-200" />
                </div>

                <button
                    type="button"
                    className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                    Continuer avec Google
                </button>

                <p className="mt-6 text-center text-sm text-neutral-500">
                    Pas encore de compte ?{" "}
                    <a href="/register" className="font-medium text-neutral-900">
                        Créer un compte
                    </a>
                </p>
            </div>
        </main>
    );
}