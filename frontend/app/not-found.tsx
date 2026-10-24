import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NotFound() {
    const session = await auth.api.getSession({ headers: await headers() });
    const href = session ? "/app" : "/login";
    const label = session ? "Retourner sur l'application" : "Se connecter";

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
            <div className="max-w-md text-center">
                <p className="text-sm font-medium text-muted-foreground mb-3">Erreur 404</p>
                <h1 className="page-title mb-4">Page introuvable</h1>
                <p className="caption mb-8">
                    La page que vous cherchez n&apos;existe pas ou a été déplacée.
                </p>
                <Button asChild>
                    <Link href={href}>
                        <ArrowLeft className="h-4 w-4" />
                        {label}
                    </Link>
                </Button>
            </div>
        </main>
    );
}
