"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Card from "@/components/ui/card";

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
                    <h1 className="text-2xl font-semibold text-neutral-900">Mon compte</h1>
                    <p className="mt-1 text-sm text-neutral-500">
                        Gérez vos informations personnelles et vos méthodes de connexion.
                    </p>
                </div>

                <Card className="p-6">
                    <h2 className="font-semibold text-neutral-900">Profil</h2>

                    <div className="mt-6 flex items-start gap-4">
                        {user.image ? (
                            <img
                                src={user.image}
                                alt={user.name}
                                className="h-16 w-16 rounded-full object-cover flex-shrink-0"
                            />
                        ) : (
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xl font-medium">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="flex-1 space-y-4">
                            <p className="text-sm text-neutral-500">{user.email}</p>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-neutral-700">
                                    Nom
                                </label>

                                <div className="flex gap-2">
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />

                                    <Button
                                        onClick={handleSaveName}
                                        disabled={savingName || name === user.name}
                                        className="flex-shrink-0 py-2"
                                    >
                                        {savingName ? "Enregistrement..." : "Enregistrer"}
                                    </Button>
                                </div>

                                {nameMessage && (
                                    <p className="mt-2 text-sm text-neutral-500">{nameMessage}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <h2 className="font-semibold text-neutral-900">Méthodes de connexion</h2>

                    {accountsLoading ? (
                        <p className="mt-4 text-sm text-neutral-500">Chargement…</p>
                    ) : (
                        <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-4">
                                <div>
                                    <p className="font-medium text-neutral-900">Mot de passe</p>
                                    <p className="text-sm text-neutral-500">
                                        Connexion avec votre email et votre mot de passe.
                                    </p>
                                </div>
                                <span className="text-sm font-medium">
                                    {hasPassword ? "Activé" : "Non configuré"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-4">
                                <div>
                                    <p className="font-medium text-neutral-900">Google</p>
                                    <p className="text-sm text-neutral-500">
                                        Connexion avec votre compte Google.
                                    </p>
                                </div>
                                <span className="text-sm font-medium">
                                    {hasGoogle ? "Connecté" : "Non connecté"}
                                </span>
                            </div>
                        </div>
                    )}
                </Card>

                <Card className="p-6">
                    <h2 className="font-semibold text-neutral-900">Sécurité</h2>
                    <div className="mt-4 space-y-2 text-sm">
                        <p>Email : {user.email}</p>
                        <p>Email vérifié : {user.emailVerified ? "Oui" : "Non"}</p>
                    </div>
                </Card>

                <Card className="border-red-200 p-6">
                    <h2 className="font-semibold text-red-700">Zone sensible</h2>
                    <p className="mt-2 text-sm text-neutral-500">
                        La suppression du compte sera disponible ici.
                    </p>
                </Card>
            </div>
        </main>
    );
}
