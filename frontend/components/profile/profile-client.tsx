"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

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

        const { error } = await authClient.updateUser({
            name,
        });

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

            if (!error && data) {
                setAccounts(data);
            }

            setAccountsLoading(false);
        }

        loadAccounts();
    }, []);

    const hasPassword = accounts.some(
        (account) => account.providerId === "credential"
    );

    const hasGoogle = accounts.some(
        (account) => account.providerId === "google"
    );

    return (
        <main className="min-h-screen bg-neutral-50 px-6 py-10">
            <div className="mx-auto max-w-3xl space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-900">
                        Mon compte
                    </h1>

                    <p className="mt-1 text-sm text-neutral-500">
                        Gérez vos informations personnelles et vos méthodes de connexion.
                    </p>
                </div>

                <section className="rounded-2xl border border-neutral-200 bg-white p-6">
                    <h2 className="font-semibold text-neutral-900">
                        Profil
                    </h2>

                    <div className="mt-6 flex items-center gap-4">
                        {user.image ? (
                            <img
                                src={user.image}
                                alt={user.name}
                                className="h-16 w-16 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xl font-medium">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div>

                            <div className="mt-6">
                                <label className="mb-1 block text-sm font-medium text-neutral-700">
                                    Nom
                                </label>

                                <div className="flex gap-2">
                                    <input
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
                                    />

                                    <button
                                        type="button"
                                        onClick={handleSaveName}
                                        disabled={savingName || name === user.name}
                                        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                                    >
                                        {savingName ? "Enregistrement..." : "Enregistrer"}
                                    </button>
                                </div>

                                {nameMessage && (
                                    <p className="mt-2 text-sm text-neutral-500">
                                        {nameMessage}
                                    </p>
                                )}
                            </div>

                            <p className="text-sm text-neutral-500">
                                {user.email}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-6">
                    <h2 className="font-semibold text-neutral-900">
                        Méthodes de connexion
                    </h2>

                    {accountsLoading ? (
                        <p className="mt-4 text-sm text-neutral-500">
                            Chargement…
                        </p>
                    ) : (
                        <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-4">
                                <div>
                                    <p className="font-medium text-neutral-900">
                                        Mot de passe
                                    </p>

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
                                    <p className="font-medium text-neutral-900">
                                        Google
                                    </p>

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
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-6">
                    <h2 className="font-semibold text-neutral-900">
                        Sécurité
                    </h2>

                    <div className="mt-4 space-y-2 text-sm">
                        <p>Email : {user.email}</p>
                        <p>
                            Email vérifié : {user.emailVerified ? "Oui" : "Non"}
                        </p>
                    </div>
                </section>

                <section className="rounded-2xl border border-red-200 bg-white p-6">
                    <h2 className="font-semibold text-red-700">
                        Zone sensible
                    </h2>

                    <p className="mt-2 text-sm text-neutral-500">
                        La suppression du compte sera disponible ici.
                    </p>
                </section>
            </div>
        </main>
    );
}