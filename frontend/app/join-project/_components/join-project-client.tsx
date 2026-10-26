"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    acceptProjectInvitation,
    declineProjectInvitation,
    type ProjectInvitationPreview,
    type UserOrgForJoin,
} from "@/lib/actions/project-invitation";

const KIND_LABELS: Record<string, string> = {
    BUILDING_COMPANY: "Entreprise du bâtiment",
    CLIENT_COMPANY: "Entreprise cliente",
    INDIVIDUAL_CLIENT: "Particulier",
};

type Props = {
    token: string;
    invitation: ProjectInvitationPreview;
    sessionEmail: string | null;
    userOrgs: UserOrgForJoin[];
};

export default function JoinProjectClient({ token, invitation, sessionEmail, userOrgs }: Props) {
    const router = useRouter();
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [declining, setDeclining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isLoggedIn = sessionEmail !== null;
    const emailMismatch =
        isLoggedIn && sessionEmail.toLowerCase() !== invitation.invitedEmail.toLowerCase();

    const redirectTo = encodeURIComponent(`/join-project?token=${token}`);
    const onboardingUrl = `/onboarding?redirectTo=${redirectTo}`;

    const eligibleOrgs = userOrgs.filter((o) => o.membershipRole !== "MEMBER");
    const memberOnlyOrgs = userOrgs.filter((o) => o.membershipRole === "MEMBER");
    const hasEligibleOrgs = eligibleOrgs.length > 0;

    async function handleAccept() {
        if (!selectedOrgId) return;
        setAccepting(true);
        setError(null);
        const result = await acceptProjectInvitation(token, selectedOrgId);
        setAccepting(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.push(`/${result.clientOrgSlug}/projects/${result.projectSlug}`);
    }

    async function handleDecline() {
        setDeclining(true);
        await declineProjectInvitation(token);
        router.push("/");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
            <Card className="w-full max-w-md p-8 shadow-sm">
                {/* En-tête projet */}
                <div className="flex items-start gap-3 mb-6">
                    <div className="mt-0.5 h-10 w-10 rounded-lg bg-subtle border border-border flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground">{invitation.projectName}</p>
                        <p className="caption">
                            <span className="font-medium text-foreground">{invitation.inviterName}</span>
                            {" "}de{" "}
                            <span className="font-medium text-foreground">{invitation.leadOrgName}</span>
                            {" "}vous invite à rejoindre ce projet en tant que client
                        </p>
                    </div>
                </div>

                {/* Avertissement email différent */}
                {emailMismatch && (
                    <div className="mb-5 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-800">
                        Cette invitation a été envoyée à{" "}
                        <strong>{invitation.invitedEmail}</strong>. Vous êtes connecté avec{" "}
                        <strong>{sessionEmail}</strong>. Connectez-vous avec le bon compte pour accepter.
                    </div>
                )}

                {error && <p className="mb-4 text-error text-sm">{error}</p>}

                {/* Non connecté */}
                {!isLoggedIn && (
                    <div className="space-y-3">
                        <p className="caption mb-1">
                            Connectez-vous ou créez un compte pour accepter cette invitation.
                        </p>
                        <Button asChild className="w-full">
                            <a href={`/login?redirectTo=${redirectTo}`}>Se connecter</a>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                            <a href={`/register?redirectTo=${redirectTo}`}>Créer un compte</a>
                        </Button>
                    </div>
                )}

                {/* Connecté mais email différent */}
                {isLoggedIn && emailMismatch && (
                    <Button asChild variant="outline" className="w-full">
                        <a href={`/login?redirectTo=${redirectTo}`}>
                            Se connecter avec {invitation.invitedEmail}
                        </a>
                    </Button>
                )}

                {/* Connecté, email correspond */}
                {isLoggedIn && !emailMismatch && (
                    <>
                        {/* Aucune organisation éligible */}
                        {!hasEligibleOrgs && memberOnlyOrgs.length === 0 && (
                            <div className="space-y-4">
                                <p className="caption">
                                    Vous n&apos;avez pas encore d&apos;organisation. Créez-en une pour accepter cette invitation — vous en serez le fondateur.
                                </p>
                                <Button asChild className="w-full">
                                    <a href={onboardingUrl}>Créer mon organisation</a>
                                </Button>
                            </div>
                        )}

                        {/* Seulement des orgs où on est membre simple */}
                        {!hasEligibleOrgs && memberOnlyOrgs.length > 0 && (
                            <div className="space-y-4">
                                <p className="caption">
                                    Vous êtes simple membre de vos organisations actuelles. Demandez à un fondateur ou manager de réaliser cette acceptation, ou créez une nouvelle organisation.
                                </p>
                                <Button asChild className="w-full">
                                    <a href={onboardingUrl}>Créer une organisation</a>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleDecline}
                                    disabled={declining}
                                >
                                    {declining ? "…" : "Ignorer"}
                                </Button>
                            </div>
                        )}

                        {/* A des orgs éligibles — sélection */}
                        {hasEligibleOrgs && (
                            <div className="space-y-5">
                                <div>
                                    <p className="text-sm font-medium text-foreground mb-3">
                                        Sélectionnez l&apos;organisation cliente pour ce projet
                                    </p>

                                    <div className="space-y-2">
                                        {/* Orgs éligibles */}
                                        {eligibleOrgs.map((org) => (
                                            <button
                                                key={org.id}
                                                onClick={() => setSelectedOrgId(org.id)}
                                                className={`w-full flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                                    selectedOrgId === org.id
                                                        ? "border-foreground bg-subtle"
                                                        : "border-border hover:bg-subtle"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                        selectedOrgId === org.id ? "border-foreground" : "border-border"
                                                    }`}>
                                                        {selectedOrgId === org.id && (
                                                            <div className="h-2 w-2 rounded-full bg-foreground" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{org.name}</p>
                                                        <p className="caption">
                                                            {KIND_LABELS[org.kind] ?? org.kind}
                                                            {" · "}
                                                            {org.membershipRole === "FOUNDER" ? "Fondateur" : "Manager"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {selectedOrgId === org.id && (
                                                    <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                                                )}
                                            </button>
                                        ))}

                                        {/* Orgs membre simple — grisées */}
                                        {memberOnlyOrgs.map((org) => (
                                            <div
                                                key={org.id}
                                                className="w-full flex items-center gap-2.5 rounded-md border border-border/50 px-3 py-2.5 opacity-50 cursor-not-allowed"
                                                title="Vous êtes simple membre de cette organisation"
                                            >
                                                <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium">{org.name}</p>
                                                    <p className="caption">
                                                        {KIND_LABELS[org.kind] ?? org.kind}
                                                        {" · "}
                                                        Membre (non autorisé)
                                                    </p>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Créer une nouvelle organisation */}
                                        <a
                                            href={onboardingUrl}
                                            className="w-full flex items-center gap-2.5 rounded-md border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                                        >
                                            <PlusCircle className="h-4 w-4 shrink-0" />
                                            Créer une nouvelle organisation
                                        </a>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <Button
                                        className="w-full"
                                        onClick={handleAccept}
                                        disabled={!selectedOrgId || accepting || declining}
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
                                        {declining ? "…" : "Ignorer"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </main>
    );
}
