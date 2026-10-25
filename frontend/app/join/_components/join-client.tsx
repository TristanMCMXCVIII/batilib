"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitation, declineInvitation } from "@/lib/actions/invitation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Loader2 } from "lucide-react";

const ROLE_LABELS: Record<"MANAGER" | "MEMBER", string> = {
    MANAGER: "Manager",
    MEMBER: "Membre",
};

type Props = {
    token: string;
    orgName: string;
    orgSlug: string;
    role: "MANAGER" | "MEMBER";
    inviterName: string;
    invitationEmail: string;
    sessionEmail: string | null;
};

export default function JoinClient({
    token,
    orgName,
    role,
    inviterName,
    invitationEmail,
    sessionEmail,
}: Props) {
    const router = useRouter();
    const [accepting, setAccepting] = useState(false);
    const [declining, setDeclining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isLoggedIn = sessionEmail !== null;
    const emailMismatch =
        isLoggedIn && sessionEmail.toLowerCase() !== invitationEmail.toLowerCase();

    const redirectTo = encodeURIComponent(`/join?token=${token}`);

    async function handleAccept() {
        setAccepting(true);
        setError(null);
        const result = await acceptInvitation(token);
        setAccepting(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.push(`/${result.orgSlug}`);
    }

    async function handleDecline() {
        setDeclining(true);
        await declineInvitation(token);
        router.push("/");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
            <Card className="w-full max-w-md p-8 shadow-sm">
                {/* En-tête org */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-lg bg-subtle border border-border flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">{orgName}</p>
                        <p className="caption">{inviterName} vous invite à rejoindre cette organisation</p>
                    </div>
                </div>

                {/* Rôle */}
                <div className="flex items-center gap-2 mb-6 p-3 rounded-md bg-subtle border border-border">
                    <p className="text-sm text-muted-foreground">Rôle assigné :</p>
                    <Badge variant="neutral">{ROLE_LABELS[role]}</Badge>
                </div>

                {/* Avertissement email différent */}
                {emailMismatch && (
                    <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800">
                        Cette invitation a été envoyée à{" "}
                        <strong>{invitationEmail}</strong>. Vous êtes connecté avec{" "}
                        <strong>{sessionEmail}</strong>. Connectez-vous avec le bon compte pour accepter.
                    </div>
                )}

                {error && <p className="mb-4 text-error text-sm">{error}</p>}

                {isLoggedIn ? (
                    <div className="space-y-3">
                        <Button
                            className="w-full"
                            onClick={handleAccept}
                            disabled={accepting || declining || emailMismatch}
                        >
                            {accepting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Acceptation…</>
                            ) : (
                                "Accepter l'invitation"
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleDecline}
                            disabled={accepting || declining}
                        >
                            {declining ? "Refus…" : "Ignorer"}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <Button asChild className="w-full">
                            <a href={`/login?redirectTo=${redirectTo}`}>Se connecter</a>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <a href={`/register?redirectTo=${redirectTo}`}>Créer un compte</a>
                        </Button>
                    </div>
                )}
            </Card>
        </main>
    );
}
