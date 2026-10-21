"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

function AuthErrorContent() {
    const searchParams = useSearchParams();

    const error =
        searchParams.get("error") ??
        searchParams.get("error_code") ??
        "unknown";

    const isAccountNotLinked = error === "account_not_linked";

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
            <Card className="w-full max-w-md p-8 shadow-sm">
                <h1 className="page-title">
                    {isAccountNotLinked
                        ? "Un compte existe déjà"
                        : "Impossible de vous connecter"}
                </h1>

                <p className="mt-3 body-sm text-muted-foreground leading-6">
                    {isAccountNotLinked
                        ? "Cette adresse email est déjà associée à un compte Batilib qui n'a pas encore été vérifié. Vérifiez d'abord votre adresse ou connectez-vous avec votre mot de passe."
                        : "Une erreur est survenue pendant la connexion. Vous pouvez réessayer."}
                </p>

                <div className="mt-6 space-y-3">
                    {isAccountNotLinked && (
                        <Button asChild className="w-full">
                            <Link href="/auth/verify-existing-account">Vérifier mon email</Link>
                        </Button>
                    )}

                    <Button asChild variant="outline" className="w-full">
                        <Link href="/login">Se connecter avec un mot de passe</Link>
                    </Button>
                </div>
            </Card>
        </main>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense>
            <AuthErrorContent />
        </Suspense>
    );
}
