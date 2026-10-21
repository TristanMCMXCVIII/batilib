"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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

        const { error } = await authClient.signUp.email({ name, email, password });

        setLoading(false);

        if (error) {
            setError(error.message ?? "Une erreur est survenue.");
            return;
        }

        await authClient.emailOtp.sendVerificationOtp({
            email,
            type: "email-verification",
        });

        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }

    async function handleGoogleRegister() {
        await authClient.signIn.social({
            provider: "google",
            callbackURL: "/app",
            errorCallbackURL: "/auth/error",
        });
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
            <Card className="w-full max-w-md p-8 shadow-sm">
                <div className="mb-8">
                    <h1 className="page-title">Créer un compte</h1>
                    <p className="mt-2 caption">Rejoignez Batilib.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <Label htmlFor="name">Nom</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Tristan Nocent"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="vous@entreprise.fr"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <Label htmlFor="password">Mot de passe</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                            placeholder="••••••••"
                        />
                    </div>

                    {error && <p className="text-error">{error}</p>}

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Création..." : "Créer mon compte"}
                    </Button>
                </form>

                <div className="auth-divider my-6">ou</div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleRegister}
                    className="w-full"
                >
                    Continuer avec Google
                </Button>

                <p className="mt-6 text-center caption">
                    Déjà un compte ?{" "}
                    <a href="/login" className="font-medium text-foreground">
                        Se connecter
                    </a>
                </p>
            </Card>
        </main>
    );
}
