"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useRouter } from "next/navigation";
import { Camera, Eye, EyeOff, KeyRound, Pencil } from "lucide-react";
import { GoogleIcon } from "@/components/ui/google-icon";

type LinkedAccount = {
    id: string;
    providerId: string;
};

type ProfileClientProps = {
    user: {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        image?: string | null;
        role?: string | null;
    };
};

const DELETE_PHRASE = "supprimer mon compte";

export default function ProfileClient({ user }: ProfileClientProps) {
    const router = useRouter();
    const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [accountsError, setAccountsError] = useState(false);

    const [imageUrl, setImageUrl] = useState(user.image ?? null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dialog suppression de compte
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletePhrase, setDeletePhrase] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Sheet changement de mot de passe
    const [passwordSheetOpen, setPasswordSheetOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // Sheet édition du profil
    const [sheetOpen, setSheetOpen] = useState(false);
    const [name, setName] = useState(user.name);
    const [displayName, setDisplayName] = useState(user.name);
    const [savingName, setSavingName] = useState(false);
    const [nameMessage, setNameMessage] = useState<string | null>(null);

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
        if (!ALLOWED.includes(file.type)) {
            setAvatarError("Format non supporté (jpeg, png, webp)");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setAvatarError("Fichier trop lourd (max 5 Mo)");
            return;
        }

        setUploadingAvatar(true);
        setAvatarError(null);

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload/avatar", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
            setAvatarError(data.error ?? "Erreur lors de l'upload");
            setUploadingAvatar(false);
            return;
        }

        const { error } = await authClient.updateUser({ image: data.url });
        if (error) {
            setAvatarError("Upload réussi mais mise à jour du profil échouée");
        } else {
            setImageUrl(data.url);
        }

        setUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function handleSaveName() {
        setSavingName(true);
        setNameMessage(null);

        const { error } = await authClient.updateUser({ name });

        setSavingName(false);

        if (error) {
            setNameMessage("Impossible de modifier le nom.");
            return;
        }

        setDisplayName(name);
        setNameMessage("Nom mis à jour.");
    }

    function handleOpenPasswordSheet() {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowCurrentPw(false);
        setShowNewPw(false);
        setShowConfirmPw(false);
        setPasswordError(null);
        setPasswordSuccess(false);
        setPasswordSheetOpen(true);
    }

    async function handleChangePassword() {
        setPasswordError(null);

        if (newPassword.length < 8) {
            setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("Les mots de passe ne correspondent pas.");
            return;
        }

        setSavingPassword(true);

        const { error } = await authClient.changePassword({
            currentPassword,
            newPassword,
            revokeOtherSessions: true,
        });

        setSavingPassword(false);

        if (error) {
            setPasswordError(
                error.status === 400
                    ? "Mot de passe actuel incorrect."
                    : "Impossible de modifier le mot de passe. Réessayez."
            );
            return;
        }

        setPasswordSuccess(true);
        setTimeout(() => setPasswordSheetOpen(false), 1500);
    }

    function handleOpenDeleteDialog() {
        setDeletePhrase("");
        setDeleteError(null);
        setDeleteDialogOpen(true);
    }

    async function handleDeleteAccount() {
        setDeleting(true);
        setDeleteError(null);

        const { error } = await authClient.deleteUser();

        if (error) {
            setDeleteError("Impossible de supprimer le compte. Réessayez ou contactez le support.");
            setDeleting(false);
            return;
        }

        router.push("/login");
    }

    function handleOpenSheet() {
        setName(displayName);
        setNameMessage(null);
        setSheetOpen(true);
    }

    useEffect(() => {
        async function loadAccounts() {
            const { data, error } = await authClient.listAccounts();

            if (error || !data) {
                setAccountsError(true);
            } else {
                setAccounts(data);
            }

            setAccountsLoading(false);
        }

        loadAccounts();
    }, []);

    const hasPassword = accounts.some((a) => a.providerId === "credential");
    const hasGoogle = accounts.some((a) => a.providerId === "google");

    return (
        <main className="page-outer pt-8 pb-10">
            <div className="max-w-2xl">
                <div className="mb-10">
                    <h1 className="page-title">Mon compte</h1>
                    <p className="mt-2 caption">
                        Gérez vos informations personnelles et vos méthodes de connexion.
                    </p>
                </div>

                <div className="space-y-16">
                    {/* Profil */}
                    <section>
                        <div className="flex items-start justify-between">
                            <h2 className="section-title">Profil</h2>
                            <Button variant="outline" size="sm" onClick={handleOpenSheet}>
                                <Pencil className="h-3.5 w-3.5" />
                                Modifier
                            </Button>
                        </div>

                        <div className="mt-5 flex items-center gap-4">
                            <div className="relative h-12 w-12 flex-shrink-0">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={displayName}
                                        className="h-12 w-12 rounded-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="avatar-initials h-12 w-12 text-base"
                                        style={{ "--avatar-bg": "var(--subtle)", "--avatar-fg": "var(--muted-foreground)" } as React.CSSProperties}
                                    >
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="body-sm font-medium">{displayName}</p>
                                <p className="caption">{user.email}</p>
                            </div>
                        </div>
                    </section>

                    {/* Méthodes de connexion */}
                    <section>
                        <h2 className="section-title mb-5">Méthodes de connexion</h2>

                        {accountsLoading ? (
                            <p className="caption">Chargement…</p>
                        ) : accountsError ? (
                            <p className="caption text-destructive">
                                Impossible de charger les méthodes de connexion.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <KeyRound className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div>
                                            <p className="body-sm font-medium">Mot de passe</p>
                                            <p className="caption">Connexion avec votre email et votre mot de passe.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={hasPassword ? "success" : "neutral"}>
                                            {hasPassword ? "Activé" : "Non configuré"}
                                        </Badge>
                                        {hasPassword && (
                                            <Button variant="outline" size="sm" onClick={handleOpenPasswordSheet}>
                                                <Pencil className="h-3.5 w-3.5" />
                                                Modifier
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <GoogleIcon className="h-4 w-4 flex-shrink-0" />
                                        <div>
                                            <p className="body-sm font-medium">Google</p>
                                            <p className="caption">Connexion avec votre compte Google.</p>
                                        </div>
                                    </div>
                                    <Badge variant={hasGoogle ? "success" : "neutral"}>
                                        {hasGoogle ? "Connecté" : "Non connecté"}
                                    </Badge>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Sécurité */}
                    <section>
                        <h2 className="section-title mb-4">Sécurité</h2>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <p className="body-sm">Email vérifié</p>
                                <Badge variant={user.emailVerified ? "success" : "warning"}>
                                    {user.emailVerified ? "Oui" : "Non"}
                                </Badge>
                            </div>
                        </div>
                    </section>

                    {/* Zone sensible */}
                    <section>
                        <h2 className="section-title text-destructive mb-2">Zone sensible</h2>
                        <p className="caption mb-4">
                            La suppression de votre compte est irréversible. Toutes vos données seront effacées.
                        </p>
                        <Button variant="outline" size="sm" onClick={handleOpenDeleteDialog} className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive">
                            Supprimer mon compte
                        </Button>
                    </section>
                </div>
            </div>

            {/* Dialog — suppression de compte */}
            <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
                if (!deleting) setDeleteDialogOpen(open);
            }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-destructive">Attention</p>
                            <DialogTitle>Supprimer mon compte</DialogTitle>
                        </div>
                        <DialogDescription>
                            Cette action est <strong className="text-foreground">irréversible</strong>. Votre compte, vos sessions et toutes vos données seront définitivement supprimés.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-2.5 py-2">
                        <Label htmlFor="delete-confirm" className="body-sm">
                            Pour confirmer, saisissez{" "}
                            <span className="font-mono font-medium text-foreground">{DELETE_PHRASE}</span>
                        </Label>
                        <Input
                            id="delete-confirm"
                            value={deletePhrase}
                            onChange={(e) => setDeletePhrase(e.target.value)}
                            placeholder={DELETE_PHRASE}
                            disabled={deleting}
                        />
                        {deleteError && (
                            <p className="text-error">{deleteError}</p>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={deleting}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={deletePhrase !== DELETE_PHRASE || deleting}
                        >
                            {deleting ? "Suppression…" : "Supprimer définitivement"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sheet — changement de mot de passe */}
            <Sheet open={passwordSheetOpen} onOpenChange={(open) => {
                if (!savingPassword) setPasswordSheetOpen(open);
            }}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Changer le mot de passe</SheetTitle>
                        <SheetDescription>
                            Après confirmation, toutes vos autres sessions seront déconnectées.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-8 space-y-5 px-1">
                        {/* Mot de passe actuel */}
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="current-pw">Mot de passe actuel</Label>
                            <div className="relative">
                                <Input
                                    id="current-pw"
                                    type={showCurrentPw ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    disabled={savingPassword || passwordSuccess}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPw((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    tabIndex={-1}
                                >
                                    {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Nouveau mot de passe */}
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="new-pw">Nouveau mot de passe</Label>
                            <div className="relative">
                                <Input
                                    id="new-pw"
                                    type={showNewPw ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={savingPassword || passwordSuccess}
                                    className="pr-10"
                                    placeholder="8 caractères minimum"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPw((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    tabIndex={-1}
                                >
                                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirmer */}
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="confirm-pw">Confirmer le nouveau mot de passe</Label>
                            <div className="relative">
                                <Input
                                    id="confirm-pw"
                                    type={showConfirmPw ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={savingPassword || passwordSuccess}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPw((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    tabIndex={-1}
                                >
                                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {passwordError && (
                            <p className="text-error">{passwordError}</p>
                        )}
                        {passwordSuccess && (
                            <p className="text-sm text-success">Mot de passe mis à jour.</p>
                        )}

                        <Button
                            onClick={handleChangePassword}
                            disabled={savingPassword || passwordSuccess || !currentPassword || !newPassword || !confirmPassword}
                            className="w-full"
                        >
                            {savingPassword ? "Enregistrement…" : "Changer le mot de passe"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Sheet — édition du profil */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Modifier le profil</SheetTitle>
                        <SheetDescription>
                            Mettez à jour votre photo et votre nom d&apos;affichage.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-8 space-y-6 px-1">
                        {/* Avatar */}
                        <div className="flex flex-col items-center gap-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingAvatar}
                                className="group relative h-20 w-20 flex-shrink-0 rounded-full focus:outline-none"
                                title="Changer la photo de profil"
                            >
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={displayName}
                                        className="h-20 w-20 rounded-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="avatar-initials h-20 w-20 text-2xl"
                                        style={{ "--avatar-bg": "var(--subtle)", "--avatar-fg": "var(--muted-foreground)" } as React.CSSProperties}
                                    >
                                        {displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                    {uploadingAvatar ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                        <Camera className="h-5 w-5 text-white" />
                                    )}
                                </div>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                            <p className="caption text-center">
                                {uploadingAvatar ? "Envoi en cours…" : "Cliquer pour changer la photo"}
                            </p>
                            {avatarError && (
                                <p className="caption text-destructive text-center">{avatarError}</p>
                            )}
                        </div>

                        {/* Nom */}
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="sheet-name">Nom</Label>
                            <Input
                                id="sheet-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Votre nom"
                            />
                            {nameMessage && (
                                <p className="caption">{nameMessage}</p>
                            )}
                        </div>

                        <Button
                            onClick={handleSaveName}
                            disabled={savingName || name === displayName}
                            className="w-full"
                        >
                            {savingName ? "Enregistrement…" : "Enregistrer"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </main>
    );
}
