"use client";

import { useState } from "react";
import { Loader2, Pencil, UserPlus } from "lucide-react";
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
    updateMemberRole,
    removeMember,
    transferFounder,
    inviteMember,
    type OrgMember,
    type OrgRole,
} from "@/lib/actions/organization-settings";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<OrgRole, string> = {
    FOUNDER: "Fondateur",
    MANAGER: "Manager",
    MEMBER: "Membre",
};

const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
    FOUNDER: "Contrôle total de l'organisation, y compris la facturation.",
    MANAGER: "Gère les projets et les intervenants.",
    MEMBER: "Accède aux projets auxquels il est assigné.",
};

type Props = {
    members: OrgMember[];
    orgSlug: string;
    isFounder: boolean;
    currentUserId: string;
};

export default function OrgMembersClient({ members, orgSlug, isFounder, currentUserId }: Props) {
    const router = useRouter();

    // Sheet: modifier un membre
    const [editMember, setEditMember] = useState<OrgMember | null>(null);
    const [editRole, setEditRole] = useState<"MANAGER" | "MEMBER">("MEMBER");
    const [savingRole, setSavingRole] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    // Dialog: retirer un membre
    const [removingMember, setRemovingMember] = useState<OrgMember | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [removeError, setRemoveError] = useState<string | null>(null);

    // Dialog: transfert du rôle fondateur
    const [transferTarget, setTransferTarget] = useState<OrgMember | null>(null);
    const [transferring, setTransferring] = useState(false);
    const [transferError, setTransferError] = useState<string | null>(null);

    // Sheet: inviter
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"MANAGER" | "MEMBER">("MEMBER");
    const [inviting, setInviting] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviteSuccess, setInviteSuccess] = useState(false);

    function openEdit(member: OrgMember) {
        setEditMember(member);
        setEditRole(member.role === "FOUNDER" ? "MANAGER" : (member.role as "MANAGER" | "MEMBER"));
        setEditError(null);
        setSavingRole(false);
    }

    async function saveRole() {
        if (!editMember) return;
        setSavingRole(true);
        setEditError(null);
        const result = await updateMemberRole(orgSlug, editMember.membershipId, editRole);
        setSavingRole(false);
        if (result.error) { setEditError(result.error); return; }
        setEditMember(null);
        router.refresh();
    }

    async function confirmRemove() {
        if (!removingMember) return;
        setConfirming(true);
        setRemoveError(null);
        const result = await removeMember(orgSlug, removingMember.membershipId);
        setConfirming(false);
        if (result.error) { setRemoveError(result.error); return; }
        setRemovingMember(null);
        router.refresh();
    }

    async function confirmTransfer() {
        if (!transferTarget) return;
        setTransferring(true);
        setTransferError(null);
        const result = await transferFounder(orgSlug, transferTarget.membershipId);
        setTransferring(false);
        if (result.error) { setTransferError(result.error); return; }
        setTransferTarget(null);
        router.refresh();
    }

    function openInvite() {
        setInviteEmail("");
        setInviteRole("MEMBER");
        setInviteError(null);
        setInviteSuccess(false);
        setInviteOpen(true);
    }

    async function submitInvite() {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        setInviteError(null);
        setInviteSuccess(false);
        const result = await inviteMember(orgSlug, inviteEmail, inviteRole);
        setInviting(false);
        if (result.error) { setInviteError(result.error); return; }
        setInviteSuccess(true);
        setInviteEmail("");
        setTimeout(() => setInviteOpen(false), 1500);
    }

    return (
        <div className="py-10 max-w-2xl space-y-16">

            {/* ── Liste des membres ── */}
            <section>
                <div className="flex items-start justify-between">
                    <h2 className="section-title">Membres ({members.length})</h2>
                    {isFounder && (
                        <Button variant="outline" size="sm" onClick={openInvite}>
                            <UserPlus className="h-3.5 w-3.5" />
                            Inviter
                        </Button>
                    )}
                </div>

                <div className="mt-5 space-y-3">
                    {members.map((member) => {
                        const isSelf = member.userId === currentUserId;
                        return (
                            <div key={member.membershipId} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 shrink-0">
                                        <AvatarImage src={member.image ?? undefined} alt={member.name} />
                                        <AvatarFallback className="text-sm font-medium">
                                            {member.name.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="body-sm font-medium">
                                            {member.name}
                                            {isSelf && <span className="ml-1.5 text-xs text-muted-foreground font-normal">(vous)</span>}
                                        </p>
                                        <p className="caption">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={member.role === "FOUNDER" ? "default" : "neutral"}>
                                        {ROLE_LABELS[member.role]}
                                    </Badge>
                                    {isFounder && !isSelf && member.role !== "FOUNDER" && (
                                        <Button variant="outline" size="sm" onClick={() => openEdit(member)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                            Modifier
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── Sheet : modifier le rôle d'un membre ── */}
            <Sheet open={!!editMember} onOpenChange={(o) => { if (!savingRole && !o) setEditMember(null); }}>
                <SheetContent>
                    {editMember && (
                        <>
                            <SheetHeader>
                                <SheetTitle>Modifier {editMember.name}</SheetTitle>
                                <SheetDescription>
                                    Changez le rôle ou retirez ce membre de l&apos;organisation.
                                </SheetDescription>
                            </SheetHeader>

                            <div className="mt-8 space-y-5 px-1">
                                <div className="flex flex-col gap-2.5">
                                    <Label>Rôle</Label>
                                    <div className="space-y-2">
                                        {(["MANAGER", "MEMBER"] as const).map((r) => (
                                            <label
                                                key={r}
                                                className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                                                    editRole === r ? "border-foreground bg-subtle" : "border-border hover:bg-subtle"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="editRole"
                                                    value={r}
                                                    checked={editRole === r}
                                                    onChange={() => setEditRole(r)}
                                                    className="sr-only"
                                                />
                                                <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${editRole === r ? "border-foreground" : "border-border"}`}>
                                                    {editRole === r && <div className="h-2 w-2 rounded-full bg-foreground" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">{ROLE_LABELS[r]}</p>
                                                    <p className="caption">{ROLE_DESCRIPTIONS[r]}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {editError && <p className="text-error">{editError}</p>}

                                <Button
                                    onClick={saveRole}
                                    disabled={savingRole || editRole === editMember.role}
                                    className="w-full"
                                >
                                    {savingRole ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</> : "Enregistrer"}
                                </Button>

                                <div className="pt-4 border-t border-border">
                                    <p className="caption mb-3">Actions avancées</p>
                                    <div className="space-y-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => { setEditMember(null); setTransferTarget(editMember); setTransferError(null); }}
                                        >
                                            Transférer le rôle fondateur
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                                            onClick={() => { setEditMember(null); setRemovingMember(editMember); setRemoveError(null); }}
                                        >
                                            Retirer de l&apos;organisation
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── Dialog : retirer un membre ── */}
            <Dialog open={!!removingMember} onOpenChange={(o) => { if (!confirming && !o) setRemovingMember(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-destructive">Attention</p>
                            <DialogTitle>Retirer {removingMember?.name}</DialogTitle>
                        </div>
                        <DialogDescription>
                            Ce membre perdra l&apos;accès à l&apos;organisation et à tous ses projets. Cette action peut être annulée en le réinvitant.
                        </DialogDescription>
                    </DialogHeader>
                    {removeError && <p className="text-error text-sm">{removeError}</p>}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setRemovingMember(null)} disabled={confirming}>Annuler</Button>
                        <Button variant="destructive" onClick={confirmRemove} disabled={confirming}>
                            {confirming ? "Retrait…" : "Retirer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Dialog : transfert fondateur ── */}
            <Dialog open={!!transferTarget} onOpenChange={(o) => { if (!transferring && !o) setTransferTarget(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-destructive">Attention</p>
                            <DialogTitle>Transférer le rôle fondateur</DialogTitle>
                        </div>
                        <DialogDescription>
                            <strong className="text-foreground">{transferTarget?.name}</strong> deviendra le nouveau fondateur. Vous passerez Manager et perdrez l&apos;accès à la facturation et aux paramètres avancés.
                        </DialogDescription>
                    </DialogHeader>
                    {transferError && <p className="text-error text-sm">{transferError}</p>}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setTransferTarget(null)} disabled={transferring}>Annuler</Button>
                        <Button variant="destructive" onClick={confirmTransfer} disabled={transferring}>
                            {transferring ? "Transfert…" : "Confirmer le transfert"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Sheet : inviter un membre ── */}
            <Sheet open={inviteOpen} onOpenChange={(o) => { if (!inviting) setInviteOpen(o); }}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Inviter un membre</SheetTitle>
                        <SheetDescription>
                            La personne recevra un email d&apos;invitation pour rejoindre cette organisation.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-8 space-y-5 px-1">
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="invite-email">Adresse email</Label>
                            <Input
                                id="invite-email"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="collaborateur@exemple.fr"
                                disabled={inviting || inviteSuccess}
                            />
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <Label>Rôle</Label>
                            <div className="space-y-2">
                                {(["MANAGER", "MEMBER"] as const).map((r) => (
                                    <label
                                        key={r}
                                        className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                                            inviteRole === r ? "border-foreground bg-subtle" : "border-border hover:bg-subtle"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="inviteRole"
                                            value={r}
                                            checked={inviteRole === r}
                                            onChange={() => setInviteRole(r)}
                                            className="sr-only"
                                        />
                                        <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${inviteRole === r ? "border-foreground" : "border-border"}`}>
                                            {inviteRole === r && <div className="h-2 w-2 rounded-full bg-foreground" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{ROLE_LABELS[r]}</p>
                                            <p className="caption">{ROLE_DESCRIPTIONS[r]}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {inviteError && <p className="text-error">{inviteError}</p>}
                        {inviteSuccess && <p className="text-sm text-success">Invitation envoyée.</p>}

                        <Button
                            onClick={submitInvite}
                            disabled={inviting || inviteSuccess || !inviteEmail.trim()}
                            className="w-full"
                        >
                            {inviting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi…</> : "Envoyer l'invitation"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
