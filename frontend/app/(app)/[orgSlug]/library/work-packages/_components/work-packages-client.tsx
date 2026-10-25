"use client";

import { useState } from "react";
import { Layers, Loader2, Pencil, Plus } from "lucide-react";
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
    createWorkPackageTemplate,
    updateWorkPackageTemplate,
    type OrgRole,
    type TradeCategoryItem,
    type WorkPackageTemplateFormData,
    type WorkPackageTemplateItem,
} from "@/lib/actions/work-package-templates";
import { useRouter } from "next/navigation";

type Props = {
    orgSlug: string;
    templates: WorkPackageTemplateItem[];
    tradeCategories: TradeCategoryItem[];
    callerRole: OrgRole | null;
};

const EMPTY_FORM: WorkPackageTemplateFormData = {
    name: "",
    description: "",
    defaultMarginRate: "",
    tradeCategoryId: "",
};

function formatRate(value: string | null): string {
    if (!value) return "—";
    const n = parseFloat(value);
    return isNaN(n) ? "—" : n + " %";
}

export default function WorkPackagesClient({ orgSlug, templates, tradeCategories, callerRole }: Props) {
    const router = useRouter();
    const canEdit = callerRole === "FOUNDER" || callerRole === "MANAGER";

    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<WorkPackageTemplateFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function openCreate() {
        setMode("create");
        setEditingId(null);
        setForm(EMPTY_FORM);
        setError(null);
        setOpen(true);
    }

    function openEdit(template: WorkPackageTemplateItem) {
        setMode("edit");
        setEditingId(template.id);
        setForm({
            name: template.name,
            description: template.description ?? "",
            defaultMarginRate: template.defaultMarginRate ?? "",
            tradeCategoryId: template.tradeCategoryId ?? "",
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
                    ? await createWorkPackageTemplate(orgSlug, form)
                    : await updateWorkPackageTemplate(orgSlug, editingId!, form);

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
                    <h2 className="section-title">Lots</h2>
                    <p className="caption mt-1">
                        Les lots regroupent des ouvrages par corps de métier ou par phase. Ils servent de base
                        pour structurer vos devis et vos chantiers.
                    </p>
                </div>
                {canEdit && (
                    <Button size="sm" onClick={openCreate} className="shrink-0 ml-6 mt-0.5">
                        <Plus className="h-3.5 w-3.5" />
                        Nouveau lot
                    </Button>
                )}
            </div>

            {/* Contenu */}
            {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-20 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                        <Layers className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="body-sm font-medium">Aucun lot</p>
                    <p className="mt-1 caption max-w-xs">
                        Créez votre premier lot type pour structurer vos chantiers et vos devis.
                    </p>
                    {canEdit && (
                        <Button size="sm" variant="outline" className="mt-6" onClick={openCreate}>
                            <Plus className="h-3.5 w-3.5" />
                            Nouveau lot
                        </Button>
                    )}
                </div>
            ) : (
                <div>
                    <p className="caption mb-3">
                        {templates.length} lot{templates.length > 1 ? "s" : ""}
                    </p>
                    <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-subtle border-b border-border">
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                        Nom
                                    </th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-44">
                                        Corps de métier
                                    </th>
                                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-32">
                                        Marge par défaut
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
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {t.tradeCategoryLabel ?? "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                                            {formatRate(t.defaultMarginRate)}
                                        </td>
                                        {canEdit && (
                                            <td className="px-2 py-3 text-center">
                                                <button
                                                    onClick={() => openEdit(t)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-hover transition-all"
                                                    aria-label="Modifier le lot"
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
                            {mode === "create" ? "Nouveau lot" : "Modifier le lot"}
                        </SheetTitle>
                        <SheetDescription>
                            {mode === "create"
                                ? "Créez un lot type pour votre bibliothèque."
                                : "Modifiez les informations de ce lot."}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-8 space-y-5 px-1">
                        <div className="space-y-2">
                            <Label htmlFor="wpt-name">
                                Nom <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="wpt-name"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Ex : Gros œuvre"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="wpt-description">Description</Label>
                            <textarea
                                id="wpt-description"
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Description ou périmètre du lot…"
                                rows={3}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="wpt-trade">Corps de métier</Label>
                            <Select
                                value={form.tradeCategoryId}
                                onValueChange={(v) => setForm((f) => ({ ...f, tradeCategoryId: v === "_none" ? "" : v }))}
                                disabled={tradeCategories.length === 0}
                            >
                                <SelectTrigger id="wpt-trade">
                                    <SelectValue placeholder={tradeCategories.length === 0 ? "Aucune catégorie définie" : "Aucun"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">Aucun</SelectItem>
                                    {tradeCategories.map((tc) => (
                                        <SelectItem key={tc.id} value={tc.id}>
                                            {tc.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="wpt-margin">Taux de marge par défaut (%)</Label>
                            <Input
                                id="wpt-margin"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={form.defaultMarginRate}
                                onChange={(e) => setForm((f) => ({ ...f, defaultMarginRate: e.target.value }))}
                                placeholder="Ex : 20"
                            />
                        </div>

                        {error && <p className="text-error">{error}</p>}

                        <Button onClick={handleSave} disabled={saving} className="w-full">
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enregistrement…
                                </>
                            ) : mode === "create" ? (
                                "Créer le lot"
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
