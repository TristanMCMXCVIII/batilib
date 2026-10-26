"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Briefcase, Home, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrganization, type OrgKind } from "@/lib/actions/organization";

const KINDS = [
    {
        value: "BUILDING_COMPANY" as OrgKind,
        icon: Building2,
        label: "Professionnel du bâtiment",
        description:
            "Gérez vos chantiers, équipes et intervenants. Créez des projets, suivez vos coûts et coordonnez vos sous-traitants. Prix affichés HT.",
        needsDetails: true,
    },
    {
        value: "CLIENT_COMPANY" as OrgKind,
        icon: Briefcase,
        label: "Entreprise cliente",
        description:
            "Vous représentez une entreprise qui commande des travaux. Suivez vos projets de construction ou de rénovation. Prix affichés HT.",
        needsDetails: true,
    },
    {
        value: "INDIVIDUAL_CLIENT" as OrgKind,
        icon: Home,
        label: "Particulier",
        description:
            "Vous faites rénover ou construire votre logement. Suivez votre chantier et échangez avec votre entreprise. Prix affichés TTC.",
        needsDetails: false,
    },
] as const;

export default function OnboardingForm({
    userName,
    context,
    redirectTo,
}: {
    userName: string;
    context?: "kicked" | null;
    redirectTo?: string;
}) {
    const router = useRouter();
    const [selected, setSelected] = useState<OrgKind | null>(null);
    const [step, setStep] = useState<1 | 2>(1);
    const [orgName, setOrgName] = useState("");
    const [siret, setSiret] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedKind = KINDS.find((k) => k.value === selected);

    async function handleContinue() {
        if (!selected) return;
        if (selectedKind?.needsDetails) {
            setStep(2);
            return;
        }
        // INDIVIDUAL_CLIENT : create immediately with user name
        await submit(selected, userName);
    }

    async function handleSubmitDetails(e: React.FormEvent) {
        e.preventDefault();
        if (!selected || !orgName.trim()) return;
        await submit(selected, orgName, siret);
    }

    async function submit(kind: OrgKind, name: string, siretValue?: string) {
        setLoading(true);
        setError(null);
        try {
            const { orgSlug } = await createOrganization({ kind, name, siret: siretValue });
            router.push(redirectTo ?? `/${orgSlug}`);
        } catch {
            setError("Une erreur est survenue. Veuillez réessayer.");
            setLoading(false);
        }
    }

    if (step === 2 && selectedKind?.needsDetails) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
                <div className="w-full max-w-md">
                    <button
                        onClick={() => setStep(1)}
                        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Retour
                    </button>

                    <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                        Votre organisation
                    </h1>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Ces informations pourront être modifiées plus tard dans les paramètres.
                    </p>

                    <form onSubmit={handleSubmitDetails} className="mt-8 space-y-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="orgName">Nom de l&apos;entreprise</Label>
                            <Input
                                id="orgName"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                placeholder="Dupont & Fils SARL"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="siret">
                                SIRET
                                <span className="ml-1.5 text-xs text-muted-foreground">(optionnel pour l&apos;instant)</span>
                            </Label>
                            <Input
                                id="siret"
                                value={siret}
                                onChange={(e) => setSiret(e.target.value)}
                                placeholder="12345678900012"
                                maxLength={14}
                            />
                        </div>

                        {error && <p className="text-error">{error}</p>}

                        <Button type="submit" className="w-full" disabled={loading || !orgName.trim()}>
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    Créer mon organisation
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md">
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                    Quel type d&apos;espace créez-vous ?
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                    {context === "kicked"
                        ? "Vous avez été retiré de votre espace. Créez-en un nouveau ou attendez une invitation par email."
                        : "Quelques étapes pour accéder à votre espace de travail."}
                </p>

                <div className="mt-6 space-y-3">
                    {KINDS.map((kind) => {
                        const Icon = kind.icon;
                        const isSelected = selected === kind.value;
                        return (
                            <button
                                key={kind.value}
                                onClick={() => setSelected(kind.value)}
                                className={`w-full rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                    isSelected
                                        ? "border-foreground bg-subtle"
                                        : "border-border bg-background hover:bg-subtle"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 rounded-md p-1.5 ${isSelected ? "bg-foreground text-background" : "bg-subtle text-muted-foreground"}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-foreground">{kind.label}</p>
                                        <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                                            {kind.description}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <p className="mt-5 text-xs text-muted-foreground">
                    Vous attendez une invitation à rejoindre un espace existant ? Elle arrivera par email.
                </p>

                {error && <p className="mt-3 text-error">{error}</p>}

                <Button
                    className="mt-6 w-full"
                    disabled={!selected || loading}
                    onClick={handleContinue}
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            Continuer
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
