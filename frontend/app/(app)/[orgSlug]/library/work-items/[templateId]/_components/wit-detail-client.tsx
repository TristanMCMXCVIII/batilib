"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Plus,
    Trash2,
    Loader2,
    Tag,
    Folder,
    GripVertical,
    FileText,
    BookOpen,
} from "lucide-react";
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
import RichTextEditor from "@/components/ui/rich-text-editor";
import {
    updateWorkItemTemplateDetail,
    type WorkItemTemplateDetail,
    type ChecklistTask,
} from "@/lib/actions/work-item-templates";
import { LOT_COLOR_MAP, type LotColorKey } from "@/lib/lot-colors";
import { randomUUID } from "crypto";

// crypto.randomUUID n'est pas disponible côté client dans tous les contextes
function genId() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type Props = {
    orgSlug: string;
    data: WorkItemTemplateDetail;
};

const UNITS = ["m²", "m³", "ml", "h", "u", "kg", "t", "forfait"] as const;
const TAX_RATES = [
    { value: "5.5", label: "5,5 %" },
    { value: "10", label: "10 %" },
    { value: "20", label: "20 %" },
] as const;

export default function WitDetailClient({ orgSlug, data }: Props) {
    const router = useRouter();

    // ─── État des champs ────────────────────────────────
    const [name, setName] = useState(data.name);
    const [description, setDescription] = useState(data.description ?? "");
    const [unit, setUnit] = useState(data.unit);
    const [defaultUnitPrice, setDefaultUnitPrice] = useState(data.defaultUnitPrice ?? "");
    const [estimatedUnitCost, setEstimatedUnitCost] = useState(data.estimatedUnitCost ?? "");
    const [defaultTaxRate, setDefaultTaxRate] = useState(data.defaultTaxRate ?? "");
    const [quantityExpression, setQuantityExpression] = useState(data.quantityExpression ?? "");

    const [technicalDoc, setTechnicalDoc] = useState<string | null>(data.technicalDoc);
    const [commercialDoc, setCommercialDoc] = useState<string | null>(data.commercialDoc);
    const [checklist, setChecklist] = useState<ChecklistTask[]>(data.defaultChecklist);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<string | null>(null);

    // ─── Image upload ───────────────────────────────────
    const uploadImage = useCallback(
        async (file: File): Promise<string | null> => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("orgSlug", orgSlug);
            formData.append("templateId", data.id);
            const res = await fetch("/api/upload/wit-doc-image", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) return null;
            const json = await res.json() as { url?: string };
            return json.url ?? null;
        },
        [orgSlug, data.id],
    );

    // ─── Save ───────────────────────────────────────────
    async function save() {
        setSaving(true);
        setError(null);
        const result = await updateWorkItemTemplateDetail(orgSlug, data.id, {
            name,
            description,
            unit,
            defaultUnitPrice,
            estimatedUnitCost,
            defaultTaxRate,
            quantityExpression,
            technicalDoc,
            commercialDoc,
            defaultChecklist: checklist,
        });
        setSaving(false);
        if (result.error) {
            setError(result.error);
        } else {
            const now = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            setSavedAt(now);
            router.refresh();
        }
    }

    // ─── Checklist ──────────────────────────────────────
    function addTask() {
        setChecklist((prev) => [...prev, { id: genId(), label: "", coefficient: 1 }]);
    }

    function updateTask(id: string, field: "label" | "coefficient", value: string | number) {
        setChecklist((prev) =>
            prev.map((t) =>
                t.id === id
                    ? { ...t, [field]: field === "coefficient" ? Number(value) : value }
                    : t,
            ),
        );
    }

    function removeTask(id: string) {
        setChecklist((prev) => prev.filter((t) => t.id !== id));
    }

    // ─── Rendu ──────────────────────────────────────────
    const wptColor = data.effectiveWptColor
        ? LOT_COLOR_MAP[data.effectiveWptColor as LotColorKey]?.hex ?? "#6b7280"
        : null;

    return (
        <div className="max-w-3xl">
            {/* En-tête */}
            <div className="flex items-start justify-between gap-4 mb-8">
                <div className="flex-1 min-w-0">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full page-title bg-transparent border-0 outline-none focus:ring-0 p-0 m-0 text-foreground placeholder:text-muted-foreground/40"
                        placeholder="Nom de l'ouvrage"
                    />
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {data.folderName && (
                            <span className="inline-flex items-center gap-1 caption">
                                <Folder className="h-3 w-3" />
                                {data.folderName}
                            </span>
                        )}
                        {data.effectiveWptName && wptColor && (
                            <span
                                className="inline-flex items-center gap-1 text-xs font-medium"
                                style={{ color: wptColor }}
                            >
                                <Tag className="h-3 w-3 shrink-0" fill="currentColor" stroke="none" />
                                {data.effectiveWptName}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {savedAt && !saving && (
                        <span className="caption">Enregistré à {savedAt}</span>
                    )}
                    <Button onClick={save} disabled={saving} size="sm">
                        {saving ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Enregistrement…
                            </>
                        ) : (
                            "Enregistrer"
                        )}
                    </Button>
                </div>
            </div>

            {error && <p className="text-error mb-6">{error}</p>}

            <div className="space-y-10">
                {/* ─── Section Général ─── */}
                <section>
                    <h2 className="section-title mb-5">Général</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Description courte</Label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Spécifications rapides…"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unité *</Label>
                            <Select value={unit} onValueChange={setUnit}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir une unité" />
                                </SelectTrigger>
                                <SelectContent>
                                    {UNITS.map((u) => (
                                        <SelectItem key={u} value={u}>
                                            {u}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantité par défaut</Label>
                            <Input
                                value={quantityExpression}
                                onChange={(e) => setQuantityExpression(e.target.value)}
                                placeholder="1  —  ou formule : {{surfaceSol}} * 1.10"
                                className="font-mono text-sm"
                            />
                            <p className="caption">
                                À l'avenir : variables de l'espace (ex. <code className="font-mono text-xs bg-subtle px-1 rounded">{"{{surfaceSol}}"}</code>)
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>TVA par défaut</Label>
                            <Select value={defaultTaxRate} onValueChange={setDefaultTaxRate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choisir un taux" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TAX_RATES.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Prix HT / Unité</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={defaultUnitPrice}
                                onChange={(e) => setDefaultUnitPrice(e.target.value)}
                                placeholder="0,00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Coût estimé / Unité</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={estimatedUnitCost}
                                onChange={(e) => setEstimatedUnitCost(e.target.value)}
                                placeholder="0,00"
                            />
                        </div>
                    </div>
                </section>

                {/* ─── Section Documentation technique ─── */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h2 className="section-title">Documentation technique</h2>
                    </div>
                    <p className="caption mb-4">
                        Visible par le LEAD et les sous-traitants. Spécifications, méthodes, photos de référence.
                    </p>
                    <RichTextEditor
                        content={technicalDoc}
                        onChange={setTechnicalDoc}
                        placeholder="Rédigez la documentation technique ici…"
                        onImageUpload={uploadImage}
                    />
                </section>

                {/* ─── Section Documentation commerciale ─── */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <h2 className="section-title">Documentation commerciale</h2>
                    </div>
                    <p className="caption mb-4">
                        Visible par le client. Descriptif clair, rendu attendu, matériaux.
                    </p>
                    <RichTextEditor
                        content={commercialDoc}
                        onChange={setCommercialDoc}
                        placeholder="Rédigez la documentation commerciale ici…"
                        onImageUpload={uploadImage}
                    />
                </section>

                {/* ─── Section Checklist ─── */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="section-title">Checklist par défaut</h2>
                        <Button size="sm" variant="outline" onClick={addTask}>
                            <Plus className="h-3.5 w-3.5" />
                            Ajouter une étape
                        </Button>
                    </div>
                    <p className="caption mb-4">
                        Étapes à valider pour considérer l'ouvrage comme terminé. Le coefficient pondère la progression.
                    </p>

                    {checklist.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-10 text-center">
                            <p className="body-sm font-medium">Aucune étape</p>
                            <p className="mt-1 caption max-w-xs">
                                Ajoutez des étapes pour suivre la progression de cet ouvrage sur les projets.
                            </p>
                            <Button size="sm" variant="outline" className="mt-4" onClick={addTask}>
                                <Plus className="h-3.5 w-3.5" />
                                Ajouter une étape
                            </Button>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-border overflow-hidden">
                            {/* En-tête colonnes */}
                            <div className="flex items-center gap-3 px-3 py-2 bg-subtle border-b border-border">
                                <div className="w-5 shrink-0" />
                                <span className="flex-1 caption font-medium">Étape</span>
                                <span className="w-24 caption font-medium text-center">Coefficient</span>
                                <div className="w-7 shrink-0" />
                            </div>

                            {checklist.map((task, idx) => {
                                const totalCoef = checklist.reduce((s, t) => s + t.coefficient, 0);
                                const weight = totalCoef > 0 ? Math.round((task.coefficient / totalCoef) * 100) : 0;
                                return (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-3 px-3 py-2 border-b border-border/50 last:border-0 bg-background hover:bg-subtle/40 transition-colors group"
                                    >
                                        <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 cursor-grab" />
                                        <Input
                                            value={task.label}
                                            onChange={(e) => updateTask(task.id, "label", e.target.value)}
                                            placeholder={`Étape ${idx + 1}`}
                                            className="flex-1 h-8 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                                        />
                                        <div className="w-24 flex items-center gap-1.5 shrink-0">
                                            <Input
                                                type="number"
                                                min="1"
                                                max="99"
                                                step="1"
                                                value={task.coefficient}
                                                onChange={(e) =>
                                                    updateTask(task.id, "coefficient", parseInt(e.target.value) || 1)
                                                }
                                                className="w-12 h-8 text-sm text-center"
                                            />
                                            <span className="caption w-10 text-right">{weight} %</span>
                                        </div>
                                        <button
                                            onClick={() => removeTask(task.id)}
                                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-hover transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Pied : total coefficients */}
                            <div className="flex items-center gap-3 px-3 py-2 bg-subtle border-t border-border">
                                <div className="w-5 shrink-0" />
                                <span className="flex-1 caption">Total</span>
                                <span className="w-24 caption text-center font-medium">
                                    {checklist.reduce((s, t) => s + t.coefficient, 0)} pts
                                </span>
                                <div className="w-7 shrink-0" />
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* Bouton save en bas aussi */}
            <div className="mt-10 flex items-center justify-between pt-6 border-t border-border">
                {error && <p className="text-error text-sm">{error}</p>}
                <div className="flex items-center gap-3 ml-auto">
                    {savedAt && !saving && (
                        <span className="caption">Enregistré à {savedAt}</span>
                    )}
                    <Button onClick={save} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enregistrement…
                            </>
                        ) : (
                            "Enregistrer les modifications"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
