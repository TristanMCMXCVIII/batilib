"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Card from "@/components/ui/card";

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

        const { error } = await authClient.signIn.email({ email, password });

        setLoading(false);

        if (error) {
            setError(error.message ?? "Email ou mot de passe incorrect.");
            return;
        }

        router.push("/app");
        router.refresh();
    }

    async function handleGoogleLogin() {
        await authClient.signIn.social({
            provider: "google",
            callbackURL: "/app",
            errorCallbackURL: "/auth/error",
        });
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
            <Card className="w-full max-w-md p-8 shadow-sm">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-neutral-900">
                        Se connecter à Batilib
                    </h1>
                    <p className="mt-2 text-sm text-neutral-500">Accédez à votre espace.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-neutral-700">
                            Email
                        </label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="vous@entreprise.fr"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-neutral-700">
                            Mot de passe
                        </label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Connexion..." : "Se connecter"}
                    </Button>
                </form>

                <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-neutral-200" />
                    <span className="text-xs text-neutral-400">ou</span>
                    <div className="h-px flex-1 bg-neutral-200" />
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleLogin}
                    className="w-full"
                >
                    Continuer avec Google
                </Button>

                <p className="mt-6 text-center text-sm text-neutral-500">
                    Pas encore de compte ?{" "}
                    <a href="/register" className="font-medium text-neutral-900">
                        Créer un compte
                    </a>
                </p>
            </Card>
        </main>
    );
}
