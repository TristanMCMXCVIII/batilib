"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";

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

export default function ProfileClient({ user }: ProfileClientProps) {
    const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
    const [accountsLoading, setAccountsLoading] = useState(true);

    const [name, setName] = useState(user.name);
    const [savingName, setSavingName] = useState(false);
    const [nameMessage, setNameMessage] = useState<string | null>(null);

    const [imageUrl, setImageUrl] = useState(user.image ?? null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Reset input pour permettre de re-sélectionner le même fichier
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

        setNameMessage("Nom mis à jour.");
    }

    useEffect(() => {
        async function loadAccounts() {
            const { data, error } = await authClient.listAccounts();

            if (!error && data) setAccounts(data);

            setAccountsLoading(false);
        }

        loadAccounts();
    }, []);

    const hasPassword = accounts.some((a) => a.providerId === "credential");
    const hasGoogle = accounts.some((a) => a.providerId === "google");

    return (
        <main className="px-6 py-10">
            <div className="mx-auto max-w-3xl space-y-6">
                <div>
                    <h1 className="page-title">Mon compte</h1>
                    <p className="mt-1 caption">
                        Gérez vos informations personnelles et vos méthodes de connexion.
                    </p>
                </div>

                {/* Profil */}
                <Card className="p-6">
                    <h2 className="section-title">Profil</h2>

                    <div className="mt-6 flex items-start gap-4">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="group relative h-16 w-16 flex-shrink-0 rounded-full focus:outline-none"
                            title="Changer la photo de profil"
                        >
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt={user.name}
                                    className="h-16 w-16 rounded-full object-cover"
                                />
                            ) : (
                                <div
                                    className="avatar-initials h-16 w-16 text-xl"
                                    style={{ "--avatar-bg": "var(--subtle)", "--avatar-fg": "var(--muted-foreground)" } as React.CSSProperties}
                                >
                                    {user.name.charAt(0).toUpperCase()}
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

                        <div className="flex-1 space-y-4">
                            <p className="caption">{user.email}</p>
                            {avatarError && (
                                <p className="caption text-destructive">{avatarError}</p>
                            )}

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="name">Nom</Label>

                                <div className="flex gap-2">
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />

                                    <Button
                                        onClick={handleSaveName}
                                        disabled={savingName || name === user.name}
                                        className="flex-shrink-0"
                                    >
                                        {savingName ? "Enregistrement..." : "Enregistrer"}
                                    </Button>
                                </div>

                                {nameMessage && (
                                    <p className="mt-1 caption">{nameMessage}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Méthodes de connexion */}
                <Card className="p-6">
                    <h2 className="section-title">Méthodes de connexion</h2>

                    {accountsLoading ? (
                        <p className="mt-4 caption">Chargement…</p>
                    ) : (
                        <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between rounded-xl border border-border p-4">
                                <div>
                                    <p className="body-sm font-medium">Mot de passe</p>
                                    <p className="caption">
                                        Connexion avec votre email et votre mot de passe.
                                    </p>
                                </div>
                                <Badge variant={hasPassword ? "success" : "neutral"}>
                                    {hasPassword ? "Activé" : "Non configuré"}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between rounded-xl border border-border p-4">
                                <div>
                                    <p className="body-sm font-medium">Google</p>
                                    <p className="caption">
                                        Connexion avec votre compte Google.
                                    </p>
                                </div>
                                <Badge variant={hasGoogle ? "success" : "neutral"}>
                                    {hasGoogle ? "Connecté" : "Non connecté"}
                                </Badge>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Sécurité */}
                <Card className="p-6">
                    <h2 className="section-title">Sécurité</h2>
                    <div className="mt-4 space-y-2">
                        <p className="body-sm">Email : {user.email}</p>
                        <p className="body-sm flex items-center gap-2">
                            Email vérifié :
                            <Badge variant={user.emailVerified ? "success" : "warning"}>
                                {user.emailVerified ? "Oui" : "Non"}
                            </Badge>
                        </p>
                    </div>
                </Card>

                {/* Zone sensible */}
                <Card className="border-destructive/30 p-6">
                    <h2 className="section-title text-destructive">Zone sensible</h2>
                    <p className="mt-2 caption">
                        La suppression du compte sera disponible ici.
                    </p>
                </Card>
            </div>
        </main>
    );
}
