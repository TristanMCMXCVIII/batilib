"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function VerifyExistingAccountPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setLoading(true);
        setError(null);

        const { error } = await authClient.emailOtp.sendVerificationOtp({
            email,
            type: "email-verification",
        });

        setLoading(false);

        if (error) {
            setError(error.message ?? "Impossible d’envoyer le code.");
            return;
        }

        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
            <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-semibold text-neutral-900">
                    Vérifiez votre adresse email
                </h1>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                    Entrez l’adresse utilisée pour votre compte Batilib. Nous vous
                    enverrons un code de vérification.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
                        {loading ? "Envoi..." : "Recevoir mon code"}
                    </button>
                </form>
            </div>
        </main>
    );
}