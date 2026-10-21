"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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
            setError(error.message ?? "Impossible d'envoyer le code.");
            return;
        }

        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
            <Card className="w-full max-w-md p-8 shadow-sm">
                <h1 className="page-title">Vérifiez votre adresse email</h1>
                <p className="mt-2 body-sm text-muted-foreground leading-6">
                    Entrez l'adresse utilisée pour votre compte Batilib. Nous vous
                    enverrons un code de vérification.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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

                    {error && <p className="text-error">{error}</p>}

                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Envoi..." : "Recevoir mon code"}
                    </Button>
                </form>
            </Card>
        </main>
    );
}
