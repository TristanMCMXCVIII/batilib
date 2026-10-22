"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[app error]", error);
    }, [error]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
            <Card className="w-full max-w-md p-8 shadow-sm">
                <h1 className="page-title">Une erreur est survenue</h1>
                <p className="mt-3 body-sm text-muted-foreground">
                    Quelque chose s&apos;est mal passé. Vous pouvez réessayer ou revenir à l&apos;accueil.
                </p>
                {error.digest && (
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
                        Référence : {error.digest}
                    </p>
                )}
                <div className="mt-6 flex gap-3">
                    <Button onClick={reset}>Réessayer</Button>
                    <Button variant="outline" asChild>
                        <a href="/app">Retour à l&apos;accueil</a>
                    </Button>
                </div>
            </Card>
        </main>
    );
}
