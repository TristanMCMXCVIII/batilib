"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setLoading(true);
        setError(null);

        const { error } = await authClient.signUp.email({
            name,
            email,
            password,
        });

        setLoading(false);

        if (error) {
            setError(error.message ?? "Une erreur est survenue.");
            return;
        }

        router.push("/app");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-neutral-900">
                        Créer un compte
                    </h1>

                    <p className="mt-2 text-sm text-neutral-500">
                        Rejoignez Batilib.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-neutral-700">
                            Nom
                        </label>

                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                            className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
                            placeholder="Tristan Nocent"
                        />
                    </div>

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
                            minLength={8}
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
                        {loading ? "Création..." : "Créer mon compte"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-neutral-500">
                    Déjà un compte ?{" "}
                    <a href="/login" className="font-medium text-neutral-900">
                        Se connecter
                    </a>
                </p>
            </div>
        </main>
    );
}