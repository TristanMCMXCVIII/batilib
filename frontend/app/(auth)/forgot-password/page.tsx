"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setLoading(true);
        setError(null);

        const { error } = await authClient.requestPasswordReset({
            email,
            redirectTo: "/reset-password",
        });

        setLoading(false);

        if (error) {
            setError(error.message ?? "Une erreur est survenue.");
            return;
        }

        setSent(true);
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
            <Card className="w-full max-w-md p-8 shadow-sm">
                {sent ? (
                    <div className="text-center">
                        <h1 className="page-title">Email envoyé</h1>
                        <p className="mt-2 caption">
                            Si un compte existe pour <span className="font-medium text-foreground">{email}</span>, vous
                            recevrez un lien pour réinitialiser votre mot de passe.
                        </p>
                        <p className="mt-6 caption">
                            <a href="/login" className="font-medium text-foreground">
                                Retour à la connexion
                            </a>
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <h1 className="page-title">Mot de passe oublié</h1>
                            <p className="mt-2 caption">
                                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de
                                passe.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex flex-col gap-2.5">
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

                            {error && <p className="text-error">{error}</p>}

                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Envoi..." : "Envoyer le lien"}
                            </Button>
                        </form>

                        <p className="mt-6 text-center caption">
                            <a href="/login" className="font-medium text-foreground">
                                Retour à la connexion
                            </a>
                        </p>
                    </>
                )}
            </Card>
        </main>
    );
}
