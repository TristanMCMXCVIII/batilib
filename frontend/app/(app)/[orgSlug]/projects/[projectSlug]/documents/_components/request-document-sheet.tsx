"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { createDocumentRequest, type WorkPackageRef } from "@/lib/actions/project-documents";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/document-constants";
import { cn } from "@/lib/utils";

type RequestedFrom = "CLIENT" | "LEAD" | "WORKPACKAGE";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgSlug: string;
    projectSlug: string;
    workPackages: WorkPackageRef[];
    hasClient: boolean;
    onSuccess: () => void;
};

export function RequestDocumentSheet({
    open,
    onOpenChange,
    orgSlug,
    projectSlug,
    workPackages,
    hasClient,
    onSuccess,
}: Props) {
    const router = useRouter();

    const [label, setLabel] = useState("");
    const [category, setCategory] = useState<DocumentCategory>("OTHER");
    const [requestedFrom, setRequestedFrom] = useState<RequestedFrom>(hasClient ? "CLIENT" : "LEAD");
    const [workPackageId, setWorkPackageId] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function reset() {
        setLabel("");
        setCategory("OTHER");
        setRequestedFrom(hasClient ? "CLIENT" : "LEAD");
        setWorkPackageId("");
        setDueDate("");
        setError(null);
        setSaving(false);
    }

    function handleOpenChange(o: boolean) {
        if (!saving) {
            if (!o) reset();
            onOpenChange(o);
        }
    }

    async function handleSubmit() {
        const trimmedLabel = label.trim();
        if (!trimmedLabel) {
            setError("La description est requise");
            return;
        }
        if (requestedFrom === "WORKPACKAGE" && !workPackageId) {
            setError("Sélectionnez un lot");
            return;
        }

        setSaving(true);
        setError(null);

        const result = await createDocumentRequest(orgSlug, projectSlug, {
            label: trimmedLabel,
            category,
            requestedFromRole: requestedFrom,
            requestedFromWorkPackageId: requestedFrom === "WORKPACKAGE" ? workPackageId : null,
            dueDate: dueDate || null,
        });

        setSaving(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        reset();
        onOpenChange(false);
        onSuccess();
        router.refresh();
    }

    const today = new Date().toISOString().split("T")[0];

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Demander un document</SheetTitle>
                    <SheetDescription>
                        Une notification sera envoyée au destinataire par email.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-8 space-y-5 px-1">
                    {/* Description */}
                    <div className="flex flex-col gap-2.5">
                        <Label htmlFor="req-label">Document demandé</Label>
                        <textarea
                            id="req-label"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Ex. Veuillez fournir le PV de réception signé…"
                            rows={3}
                            disabled={saving}
                            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        />
                    </div>

                    {/* Catégorie */}
                    <div className="flex flex-col gap-2.5">
                        <Label>Catégorie</Label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {(Object.entries(DOCUMENT_CATEGORIES) as [DocumentCategory, { label: string }][]).map(([key, { label: catLabel }]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setCategory(key)}
                                    disabled={saving}
                                    className={cn(
                                        "rounded-lg border px-2 py-1.5 text-xs font-medium text-center transition-colors",
                                        category === key
                                            ? "border-foreground bg-foreground text-background"
                                            : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                                    )}
                                >
                                    {catLabel}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Destinataire */}
                    <div className="flex flex-col gap-2.5">
                        <Label>Demander à</Label>
                        <div className="space-y-1.5">
                            {/* CLIENT */}
                            <button
                                type="button"
                                onClick={() => setRequestedFrom("CLIENT")}
                                disabled={saving || !hasClient}
                                className={cn(
                                    "w-full flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors",
                                    requestedFrom === "CLIENT" && hasClient
                                        ? "border-foreground bg-subtle"
                                        : !hasClient
                                        ? "border-border opacity-40 cursor-not-allowed"
                                        : "border-border hover:border-foreground/40 hover:bg-subtle",
                                )}
                            >
                                <Radio active={requestedFrom === "CLIENT" && hasClient} />
                                <div>
                                    <p className="text-sm font-medium leading-none">Le client</p>
                                    {!hasClient && (
                                        <p className="caption mt-0.5 text-muted-foreground">Aucun client invité sur ce projet</p>
                                    )}
                                </div>
                            </button>

                            {/* WORKPACKAGE (sous-traitant via lot) */}
                            {workPackages.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setRequestedFrom("WORKPACKAGE")}
                                    disabled={saving}
                                    className={cn(
                                        "w-full flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors",
                                        requestedFrom === "WORKPACKAGE"
                                            ? "border-foreground bg-subtle"
                                            : "border-border hover:border-foreground/40 hover:bg-subtle",
                                    )}
                                >
                                    <Radio active={requestedFrom === "WORKPACKAGE"} />
                                    <p className="text-sm font-medium leading-none">Un sous-traitant (via un lot)</p>
                                </button>
                            )}

                            {/* LEAD (par un ST qui demande au pilote) */}
                            <button
                                type="button"
                                onClick={() => setRequestedFrom("LEAD")}
                                disabled={saving}
                                className={cn(
                                    "w-full flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors",
                                    requestedFrom === "LEAD"
                                        ? "border-foreground bg-subtle"
                                        : "border-border hover:border-foreground/40 hover:bg-subtle",
                                )}
                            >
                                <Radio active={requestedFrom === "LEAD"} />
                                <p className="text-sm font-medium leading-none">Le pilote du projet</p>
                            </button>
                        </div>
                    </div>

                    {/* Sélecteur lot si WORKPACKAGE */}
                    {requestedFrom === "WORKPACKAGE" && (
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="req-wp">Lot</Label>
                            <select
                                id="req-wp"
                                value={workPackageId}
                                onChange={(e) => setWorkPackageId(e.target.value)}
                                disabled={saving}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="">Sélectionner un lot…</option>
                                {workPackages.map((wp) => (
                                    <option key={wp.id} value={wp.id}>{wp.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Échéance */}
                    <div className="flex flex-col gap-2.5">
                        <Label htmlFor="req-due">Échéance <span className="caption">(optionnel)</span></Label>
                        <input
                            id="req-due"
                            type="date"
                            min={today}
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            disabled={saving}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>

                    {error && <p className="text-error">{error}</p>}

                    <Button
                        onClick={handleSubmit}
                        disabled={saving || !label.trim()}
                        className="w-full"
                    >
                        {saving ? "Envoi en cours…" : "Envoyer la demande"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function Radio({ active }: { active: boolean }) {
    return (
        <div className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
            active ? "border-foreground" : "border-border",
        )}>
            {active && <div className="h-2 w-2 rounded-full bg-foreground" />}
        </div>
    );
}
