"use client";

import { useState } from "react";
import { Building2, Loader2, Lock, RefreshCw, UserPlus, Users, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    inviteClientToProject,
    resendProjectInvitation,
    cancelProjectInvitation,
    removeProjectClient,
    type ProjectMembersData,
    type ProjectParticipantItem,
    type ProjectClientInvitation,
} from "@/lib/actions/project-members";
import { useRouter } from "next/navigation";

type Props = {
    orgSlug: string;
    projectSlug: string;
    data: ProjectMembersData;
    clientInvitation: ProjectClientInvitation | null;
};

const KIND_LABELS: Record<string, string> = {
    BUILDING_COMPANY: "Entreprise du bâtiment",
    CLIENT_COMPANY: "Entreprise cliente",
    INDIVIDUAL_CLIENT: "Particulier",
};

function formatExpiry(isoDate: string): string {
    const diff = new Date(isoDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Expire aujourd'hui";
    if (days === 1) return "Expire demain";
    return `Expire dans ${days}j`;
}

function OrgInitials({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
    return (
        <div className="h-9 w-9 shrink-0 rounded-full bg-subtle border border-border flex items-center justify-center">
            <span className="text-xs font-semibold text-muted-foreground">{initials || "?"}</span>
        </div>
    );
}

function ParticipantMembersList({ participant }: { participant: ProjectParticipantItem }) {
    if (participant.members.length === 0) {
        return <p className="caption mt-3 ml-0.5">Aucun membre assigné à ce projet.</p>;
    }

    return (
        <div className="mt-3 space-y-2.5">
            {participant.members.map((m) => (
                <div key={m.membershipId} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={m.image ?? undefined} alt={m.name} />
                        <AvatarFallback className="text-xs font-medium">
                            {m.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="body-sm font-medium leading-none">{m.name}</p>
                        <p className="caption mt-0.5">{m.email}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ProjectMembersClient({ orgSlug, projectSlug, data, clientInvitation }: Props) {
    const router = useRouter();

    const lead = data.participants.find((p) => p.role === "LEAD");
    const client = data.participants.find((p) => p.role === "CLIENT");
    const canManage =
        data.callerParticipantRole === "LEAD" &&
        (data.callerRole === "FOUNDER" || data.callerRole === "MANAGER");

    // Sheet: inviter le client
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    // Actions invitation en attente
    const [resending, setResending] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    // Dialog: retirer le client
    const [removeClientOpen, setRemoveClientOpen] = useState(false);
    const [removingClient, setRemovingClient] = useState(false);
    const [removeClientError, setRemoveClientError] = useState<string | null>(null);

    function openInvite() {
        setInviteEmail("");
        setInviteError(null);
        setInviteSuccess(false);
        setInviteOpen(true);
    }

    async function submitInvite() {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        setInviteError(null);
        setInviteSuccess(false);
        const result = await inviteClientToProject(orgSlug, projectSlug, inviteEmail.trim());
        setInviting(false);
        if (result.error) {
            setInviteError(result.error);
            return;
        }
        setInviteSuccess(true);
        setTimeout(() => {
            setInviteOpen(false);
            router.refresh();
        }, 1500);
    }

    async function handleResend() {
        setResending(true);
        await resendProjectInvitation(orgSlug, projectSlug);
        setResending(false);
        router.refresh();
    }

    async function handleCancel() {
        setCancelling(true);
        await cancelProjectInvitation(orgSlug, projectSlug);
        setCancelling(false);
        router.refresh();
    }

    async function confirmRemoveClient() {
        setRemovingClient(true);
        setRemoveClientError(null);
        const result = await removeProjectClient(orgSlug, projectSlug);
        setRemovingClient(false);
        if (result.error) {
            setRemoveClientError(result.error);
            return;
        }
        setRemoveClientOpen(false);
        router.refresh();
    }

    return (
        <main className="page-outer pt-8 pb-10">
            <div className="max-w-2xl">
                <div className="mb-10">
                    <h1 className="page-title">Intervenants</h1>
                    <p className="mt-2 caption">
                        Gérez les organisations et personnes impliquées dans ce projet.
                    </p>
                </div>

                <div className="space-y-16">

                    {/* ── Équipe pro ── */}
                    <section>
                        <div className="flex items-start justify-between">
                            <h2 className="section-title">Équipe pro</h2>
                            <Badge variant="neutral">Votre organisation</Badge>
                        </div>

                        {lead ? (
                            <>
                                <div className="mt-5 flex items-center gap-3">
                                    {lead.organization.logoUrl ? (
                                        <img
                                            src={lead.organization.logoUrl}
                                            alt={lead.organization.name}
                                            className="h-9 w-9 rounded-full object-cover shrink-0"
                                        />
                                    ) : (
                                        <OrgInitials name={lead.organization.name} />
                                    )}
                                    <div>
                                        <p className="body-sm font-medium">{lead.organization.name}</p>
                                        <p className="caption">
                                            {KIND_LABELS[lead.organization.kind] ?? lead.organization.kind}
                                        </p>
                                    </div>
                                </div>
                                <ParticipantMembersList participant={lead} />
                            </>
                        ) : (
                            <p className="caption mt-3">Organisation introuvable.</p>
                        )}
                    </section>

                    {/* ── Client ── */}
                    <section>
                        <div className="flex items-start justify-between">
                            <h2 className="section-title">Client</h2>
                            {!client && !clientInvitation && canManage && (
                                <Button variant="outline" size="sm" onClick={openInvite}>
                                    <UserPlus className="h-3.5 w-3.5" />
                                    Inviter le client
                                </Button>
                            )}
                            {client && canManage && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                                    onClick={() => { setRemoveClientError(null); setRemoveClientOpen(true); }}
                                >
                                    Retirer le client
                                </Button>
                            )}
                        </div>

                        {/* Client assigné */}
                        {client && (
                            <>
                                <div className="mt-5 flex items-center gap-3">
                                    {client.organization.logoUrl ? (
                                        <img
                                            src={client.organization.logoUrl}
                                            alt={client.organization.name}
                                            className="h-9 w-9 rounded-full object-cover shrink-0"
                                        />
                                    ) : (
                                        <OrgInitials name={client.organization.name} />
                                    )}
                                    <div>
                                        <p className="body-sm font-medium">{client.organization.name}</p>
                                        <p className="caption">
                                            {KIND_LABELS[client.organization.kind] ?? client.organization.kind}
                                        </p>
                                    </div>
                                </div>
                                <ParticipantMembersList participant={client} />
                            </>
                        )}

                        {/* Invitation en attente */}
                        {!client && clientInvitation && (
                            <div className="mt-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 shrink-0 rounded-full bg-subtle border border-border flex items-center justify-center">
                                            <span className="text-sm text-muted-foreground">?</span>
                                        </div>
                                        <div>
                                            <p className="body-sm font-medium">{clientInvitation.email}</p>
                                            <p className="caption">{formatExpiry(clientInvitation.expiresAt)}</p>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleResend}
                                                disabled={resending || cancelling}
                                            >
                                                {resending
                                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    : <RefreshCw className="h-3.5 w-3.5" />}
                                                Renvoyer
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                                                onClick={handleCancel}
                                                disabled={resending || cancelling}
                                            >
                                                {cancelling
                                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    : <X className="h-3.5 w-3.5" />}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <p className="caption mt-2 ml-0.5">Invitation en attente d&apos;acceptation.</p>
                            </div>
                        )}

                        {/* Empty state */}
                        {!client && !clientInvitation && (
                            <div className="mt-5 rounded-lg border border-dashed border-border bg-subtle/50 px-6 py-8 text-center">
                                <Users className="mx-auto h-7 w-7 text-muted-foreground/50 mb-3" />
                                <p className="body-sm font-medium text-muted-foreground">
                                    Aucun client ajouté
                                </p>
                                <p className="caption mt-1">
                                    Invitez votre client pour qu&apos;il puisse accéder au projet.
                                </p>
                                {canManage && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-4"
                                        onClick={openInvite}
                                    >
                                        <UserPlus className="h-3.5 w-3.5" />
                                        Inviter le client
                                    </Button>
                                )}
                            </div>
                        )}
                    </section>

                    {/* ── Sous-traitants ── */}
                    <section>
                        <div className="flex items-start justify-between">
                            <h2 className="section-title text-muted-foreground/60">Sous-traitants</h2>
                            <div className="flex items-center gap-1.5">
                                <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                                <span className="text-xs text-muted-foreground/60 font-medium">Plan supérieur</span>
                            </div>
                        </div>

                        <div className="mt-5 rounded-lg border border-dashed border-border/50 bg-subtle/30 px-6 py-8 text-center">
                            <Building2 className="mx-auto h-7 w-7 text-muted-foreground/30 mb-3" />
                            <p className="body-sm font-medium text-muted-foreground/60">
                                Sous-traitants non disponibles
                            </p>
                            <p className="caption mt-1 text-muted-foreground/50">
                                L&apos;ajout de sous-traitants est disponible sur les plans Team et supérieur.
                                Les sous-traitants sont ensuite assignés directement aux lots du projet.
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            {/* ── Sheet : inviter le client ── */}
            <Sheet open={inviteOpen} onOpenChange={(o) => { if (!inviting) setInviteOpen(o); }}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Inviter le client</SheetTitle>
                        <SheetDescription>
                            Le client recevra un email pour accéder à ce projet. Il pourra se connecter ou créer un compte, puis sélectionner son organisation.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-8 space-y-5 px-1">
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="invite-client-email">Adresse email</Label>
                            <Input
                                id="invite-client-email"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="client@exemple.fr"
                                disabled={inviting || inviteSuccess}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && inviteEmail.trim() && !inviting) submitInvite();
                                }}
                            />
                        </div>

                        {inviteError && <p className="text-error">{inviteError}</p>}
                        {inviteSuccess && <p className="text-sm text-success">Invitation envoyée.</p>}

                        <Button
                            onClick={submitInvite}
                            disabled={inviting || inviteSuccess || !inviteEmail.trim()}
                            className="w-full"
                        >
                            {inviting
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi…</>
                                : "Envoyer l'invitation"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Dialog : retirer le client ── */}
            <Dialog open={removeClientOpen} onOpenChange={(o) => { if (!removingClient) setRemoveClientOpen(o); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-destructive">Attention</p>
                            <DialogTitle>Retirer le client</DialogTitle>
                        </div>
                        <DialogDescription>
                            <strong className="text-foreground">{client?.organization.name}</strong> perdra l&apos;accès à ce projet. Vous pourrez réinviter un client par la suite.
                        </DialogDescription>
                    </DialogHeader>
                    {removeClientError && <p className="text-error text-sm">{removeClientError}</p>}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setRemoveClientOpen(false)} disabled={removingClient}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={confirmRemoveClient} disabled={removingClient}>
                            {removingClient ? "Retrait…" : "Retirer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}
