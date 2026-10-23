"use client";

import { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
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
import { updateOrganization, type OrgData, type OrgKind } from "@/lib/actions/organization-settings";

const KIND_LABELS: Record<OrgKind, string> = {
    BUILDING_COMPANY: "Professionnel du bâtiment",
    CLIENT_COMPANY: "Entreprise cliente",
    INDIVIDUAL_CLIENT: "Particulier",
};

type Props = { org: OrgData; orgId: string; isFounder: boolean };

export default function OrgPresentationClient({ org, orgId, isFounder }: Props) {
    // Displayed values (updated on save)
    const [displayed, setDisplayed] = useState(org);

    // Sheet: identité
    const [identityOpen, setIdentityOpen] = useState(false);
    const [name, setName] = useState(org.name);
    const [description, setDescription] = useState(org.description ?? "");
    const [kind, setKind] = useState<OrgKind>(org.kind);
    const [savingIdentity, setSavingIdentity] = useState(false);
    const [identityError, setIdentityError] = useState<string | null>(null);

    // Sheet: informations légales
    const [legalOpen, setLegalOpen] = useState(false);
    const [siret, setSiret] = useState(org.siret ?? "");
    const [savingLegal, setSavingLegal] = useState(false);
    const [legalError, setLegalError] = useState<string | null>(null);

    function openIdentity() {
        setName(displayed.name);
        setDescription(displayed.description ?? "");
        setKind(displayed.kind);
        setIdentityError(null);
        setIdentityOpen(true);
    }

    function openLegal() {
        setSiret(displayed.siret ?? "");
        setLegalError(null);
        setLegalOpen(true);
    }

    async function saveIdentity() {
        if (!name.trim()) return;
        setSavingIdentity(true);
        setIdentityError(null);
        const result = await updateOrganization(orgId, { name, description, kind });
        setSavingIdentity(false);
        if (result.error) { setIdentityError(result.error); return; }
        setDisplayed((d) => ({ ...d, name, description: description || null, kind }));
        setIdentityOpen(false);
    }

    async function saveLegal() {
        setSavingLegal(true);
        setLegalError(null);
        const result = await updateOrganization(orgId, { siret });
        setSavingLegal(false);
        if (result.error) { setLegalError(result.error); return; }
        setDisplayed((d) => ({ ...d, siret: siret.trim() || null }));
        setLegalOpen(false);
    }

    return (
        <div className="py-10 max-w-2xl space-y-16">

            {/* ── Identité ── */}
            <section>
                <div className="flex items-start justify-between">
                    <h2 className="section-title">Identité</h2>
                    {isFounder && (
                        <Button variant="outline" size="sm" onClick={openIdentity}>
                            <Pencil className="h-3.5 w-3.5" />
                            Modifier
                        </Button>
                    )}
                </div>

                <div className="mt-5 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 shrink-0 rounded-lg border border-border bg-subtle flex items-center justify-center text-lg font-semibold text-muted-foreground select-none">
                            {displayed.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="body-sm font-medium">{displayed.name}</p>
                            <Badge variant="neutral" className="mt-1">{KIND_LABELS[displayed.kind]}</Badge>
                        </div>
                    </div>

                    {displayed.description && (
                        <p className="body-sm text-muted-foreground">{displayed.description}</p>
                    )}
                    {!displayed.description && (
                        <p className="caption italic">Aucune description renseignée.</p>
                    )}
                </div>
            </section>

            {/* ── Informations légales (non-particuliers) ── */}
            {displayed.kind !== "INDIVIDUAL_CLIENT" && (
                <section>
                    <div className="flex items-start justify-between">
                        <h2 className="section-title">Informations légales</h2>
                        {isFounder && (
                            <Button variant="outline" size="sm" onClick={openLegal}>
                                <Pencil className="h-3.5 w-3.5" />
                                Modifier
                            </Button>
                        )}
                    </div>

                    <div className="mt-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="body-sm font-medium">SIRET</p>
                                <p className="caption">Numéro unique d&apos;identification de l&apos;établissement.</p>
                            </div>
                            <p className="body-sm font-mono">
                                {displayed.siret || <span className="caption italic">Non renseigné</span>}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* ── Sheet : modifier l'identité ── */}
            <Sheet open={identityOpen} onOpenChange={(o) => { if (!savingIdentity) setIdentityOpen(o); }}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Modifier l&apos;identité</SheetTitle>
                        <SheetDescription>
                            Nom, type et description de votre organisation.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-8 space-y-5 px-1">
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="org-name">Nom</Label>
                            <Input
                                id="org-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={savingIdentity}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="org-description">
                                Description
                                <span className="ml-1.5 text-xs text-muted-foreground">(facultative)</span>
                            </Label>
                            <textarea
                                id="org-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={savingIdentity}
                                rows={3}
                                placeholder="Décrivez votre activité en quelques mots…"
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
                            />
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <Label>Type d&apos;organisation</Label>
                            <div className="space-y-2">
                                {(Object.keys(KIND_LABELS) as OrgKind[]).map((k) => (
                                    <label
                                        key={k}
                                        className={`flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                                            kind === k ? "border-foreground bg-subtle" : "border-border hover:bg-subtle"
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="kind"
                                            value={k}
                                            checked={kind === k}
                                            onChange={() => setKind(k)}
                                            className="sr-only"
                                        />
                                        <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${kind === k ? "border-foreground" : "border-border"}`}>
                                            {kind === k && <div className="h-2 w-2 rounded-full bg-foreground" />}
                                        </div>
                                        <span className="text-sm">{KIND_LABELS[k]}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {identityError && <p className="text-error">{identityError}</p>}

                        <Button
                            onClick={saveIdentity}
                            disabled={savingIdentity || !name.trim()}
                            className="w-full"
                        >
                            {savingIdentity ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</> : "Enregistrer"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Sheet : informations légales ── */}
            <Sheet open={legalOpen} onOpenChange={(o) => { if (!savingLegal) setLegalOpen(o); }}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Informations légales</SheetTitle>
                        <SheetDescription>
                            Ces informations seront vérifiées automatiquement dans une prochaine version.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-8 space-y-5 px-1">
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="org-siret">SIRET</Label>
                            <Input
                                id="org-siret"
                                value={siret}
                                onChange={(e) => setSiret(e.target.value)}
                                disabled={savingLegal}
                                placeholder="12345678900012"
                                maxLength={14}
                            />
                        </div>

                        {legalError && <p className="text-error">{legalError}</p>}

                        <Button
                            onClick={saveLegal}
                            disabled={savingLegal}
                            className="w-full"
                        >
                            {savingLegal ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enregistrement…</> : "Enregistrer"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
