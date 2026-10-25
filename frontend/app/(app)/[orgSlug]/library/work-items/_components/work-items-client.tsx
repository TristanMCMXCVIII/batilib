"use client";

import { useState } from "react";
import { Loader2, Package, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    createWorkTemplate,
    updateWorkTemplate,
    type OrgRole,
    type WorkTemplateFormData,
    type WorkTemplateItem,
} from "@/lib/actions/work-templates";
import { useRouter } from "next/navigation";

type Props = {
    orgSlug: string;
    templates: WorkTemplateItem[];
    callerRole: OrgRole | null;
};

const EMPTY_FORM: WorkTemplateFormData = {
    name: "",
    description: "",
    unit: "",
    defaultUnitPrice: "",
    estimatedUnitCost: "",
    defaultTaxRate: "",
};

const UNITS = ["m²", "m³", "ml", "h", "u", "kg", "t", "forfait"] as const;
const TAX_RATES = ["5.5", "10", "20"] as const;

function formatPrice(value: string | null): string {
    if (!value) return "—";
    const n = parseFloat(value);
    return isNaN(n) ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatRate(value: string | null): string {
    if (!value) return "—";
    const n = parseFloat(value);
    return isNaN(n) ? "—" : n + " %";
}

export default function WorkItemsClient({ orgSlug, templates, callerRole }: Props) {
    const router = useRouter();
    const canEdit = callerRole === "FOUNDER" || callerRole === "MANAGER";

    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<WorkTemplateFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function openCreate() {
        setMode("create");
        setEditingId(null);
        setForm(EMPTY_FORM);
        setError(null);
        setOpen(true);
    }

    function openEdit(template: WorkTemplateItem) {
        setMode("edit");
        setEditingId(template.id);
        setForm({
            name: template.name,
            description: template.description ?? "",
            unit: template.unit,
            defaultUnitPrice: template.defaultUnitPrice ?? "",
            estimatedUnitCost: template.estimatedUnitCost ?? "",
            defaultTaxRate: template.defaultTaxRate ?? "",
        });
        setError(null);
        setOpen(true);
    }

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const res =
                mode === "create"
                    ? await createWorkTemplate(orgSlug, form)
                    : await updateWorkTemplate(orgSlug, editingId!, form);

            if (res.error) {
                setError(res.error);
                return;
            }
            setOpen(false);
            router.refresh();
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="py-8 max-w-5xl">
            {/* En-tête */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="section-title">Ouvrages</h2>
                    <p className="caption mt-1">
                        Unités de travail élémentaires avec leurs prix et rendements de référence.
                    </p>
                </div>
                {canEdit && (
                    <Button size="sm" onClick={openCreate} className="shrink-0 ml-6 mt-0.5">
                        <Plus className="h-3.5 w-3.5" />
                        Nouvel ouvrage
                    </Button>
                )}
            </div>

            {/* Contenu */}
            {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-20 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                        <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="body-sm font-medium">Aucun ouvrage</p>
                    <p className="mt-1 caption max-w-xs">
                        Ajoutez votre premier ouvrage pour commencer à capitaliser sur vos prix et rendements.
                    </p>
                    {canEdit && (
                        <Button size="sm" variant="outline" className="mt-6" onClick={openCreate}>
                            <Plus className="h-3.5 w-3.5" />
                            Nouvel ouvrage
                        </Button>
                    )}
                </div>
            ) : (
                <div>
                    <p className="caption mb-3">
                        {templates.length} ouvrage{templates.length > 1 ? "s" : ""}
                    </p>
                    <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-subtle border-b border-border">
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                        Nom
                                    </th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-20">
                                        Unité
                                    </th>
                                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-36">
                                        Prix HT / U
                                    </th>
                                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-36">
                                        Coût est. / U
                                    </th>
                                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-20">
                                        TVA
                                    </th>
                                    {canEdit && <th className="w-12 px-2" />}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {templates.map((t) => (
                                    <tr key={t.id} className="hover:bg-subtle/50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-foreground">{t.name}</span>
                                            {t.description && (
                                                <p className="caption truncate max-w-sm mt-0.5">{t.description}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{t.unit}</td>
                                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                                            {formatPrice(t.defaultUnitPrice)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                                            {formatPrice(t.estimatedUnitCost)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                                            {formatRate(t.defaultTaxRate)}
                                        </td>
                                        {canEdit && (
                                            <td className="px-2 py-3 text-center">
                                                <button
                                                    onClick={() => openEdit(t)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-hover transition-all"
                                                    aria-label="Modifier l'ouvrage"
                                                >
                                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sheet création / édition */}
            <Sheet open={open} onOpenChange={(o) => { if (!saving) setOpen(o); }}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>
                            {mode === "create" ? "Nouvel ouvrage" : "Modifier l'ouvrage"}
                        </SheetTitle>
                        <SheetDescription>
                            {mode === "create"
                                ? "Créez un ouvrage de référence pour votre bibliothèque."
                                : "Modifiez les informations principales de cet ouvrage."}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-8 space-y-5 px-1">
                        <div className="space-y-2">
                            <Label htmlFor="wt-name">
                                Nom <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="wt-name"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Ex : Pose de carrelage au sol"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="wt-description">Description</Label>
                            <textarea
                                id="wt-description"
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Description ou spécifications techniques…"
                                rows={3}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="wt-unit">
                                Unité <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={form.unit}
                                onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
                            >
                                <SelectTrigger id="wt-unit">
                                    <SelectValue placeholder="Choisir une unité" />
                                </SelectTrigger>
                                <SelectContent>
                                    {UNITS.map((u) => (
                                        <SelectItem key={u} value={u}>{u}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="wt-price">Prix HT / Unité</Label>
                                <Input
                                    id="wt-price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.defaultUnitPrice}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, defaultUnitPrice: e.target.value }))
                                    }
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="wt-cost">Coût est. / Unité</Label>
                                <Input
                                    id="wt-cost"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.estimatedUnitCost}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, estimatedUnitCost: e.target.value }))
                                    }
                                    placeholder="0,00"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="wt-tax">Taux de TVA</Label>
                            <Select
                                value={form.defaultTaxRate}
                                onValueChange={(v) => setForm((f) => ({ ...f, defaultTaxRate: v }))}
                            >
                                <SelectTrigger id="wt-tax">
                                    <SelectValue placeholder="Choisir un taux" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TAX_RATES.map((r) => (
                                        <SelectItem key={r} value={r}>{r} %</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {error && <p className="text-error">{error}</p>}

                        <Button onClick={handleSave} disabled={saving} className="w-full">
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enregistrement…
                                </>
                            ) : mode === "create" ? (
                                "Créer l'ouvrage"
                            ) : (
                                "Enregistrer"
                            )}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </main>
    );
}
