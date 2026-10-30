"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    createWorkItem,
    updateWorkItem,
    type WorkItemItem,
} from "@/lib/actions/project-editor";
import { LOT_COLOR_MAP, type LotColorKey } from "@/lib/lot-colors";
import {
    computeWorkItemFinancials,
    formatCurrency,
    normalizeTva,
    TVA_OPTIONS,
} from "@/lib/pricing";
import { useEditor } from "./editor-context";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    spaceId: string | null;
    spaceName: string | null;
    editItem?: WorkItemItem;
    defaultWorkPackageId?: string;
};

export default function WorkItemFormSheet({
    open,
    onOpenChange,
    spaceId,
    spaceName,
    editItem,
    defaultWorkPackageId,
}: Props) {
    const { orgSlug, projectSlug, workPackages, projectDefaultMarginRate, onRefresh } = useEditor();

    // ─── Base ─────────────────────────────────────────────
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [unit, setUnit] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [workPackageId, setWorkPackageId] = useState("");

    // ─── Financier ────────────────────────────────────────
    const [puEstimeHt, setPuEstimeHt] = useState("");
    const [puSubcontractorHt, setPuSubcontractorHt] = useState("");
    const [quantitySubcontractor, setQuantitySubcontractor] = useState("");
    /** "" = hérite du lot ; "30" = 30 % override */
    const [marginRateStr, setMarginRateStr] = useState("");
    const [tauxTva, setTauxTva] = useState<"0.055" | "0.10" | "0.20">("0.10");

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setName(editItem?.name ?? "");
            setDescription(editItem?.description ?? "");
            setUnit(editItem?.unit ?? "");
            setQuantity(editItem?.quantity ?? "1");
            setWorkPackageId(editItem?.workPackageId ?? defaultWorkPackageId ?? "");
            setPuEstimeHt(editItem?.puEstimeHt ?? "");
            setPuSubcontractorHt(editItem?.puSubcontractorHt ?? "");
            setQuantitySubcontractor(editItem?.quantitySubcontractor ?? "");
            setMarginRateStr(
                editItem?.marginRate
                    ? (parseFloat(editItem.marginRate) * 100).toFixed(0)
                    : "",
            );
            setTauxTva(normalizeTva(editItem?.tauxTva ?? null));
            setError("");
        }
    }, [open, editItem, defaultWorkPackageId]);

    // ─── Calculs live ────────────────────────────────────
    const selectedPkg = workPackages.find((wp) => wp.id === workPackageId);
    const lotMarginRate = selectedPkg?.marginRate ? parseFloat(selectedPkg.marginRate) : null;
    const itemMarginRate = marginRateStr ? parseFloat(marginRateStr) / 100 : null;

    const pricing = computeWorkItemFinancials(
        {
            puEstimeHt: puEstimeHt ? parseFloat(puEstimeHt) : null,
            quantity: parseFloat(quantity) || 0,
            puSubcontractorHt: puSubcontractorHt ? parseFloat(puSubcontractorHt) : null,
            quantitySubcontractor: quantitySubcontractor ? parseFloat(quantitySubcontractor) : null,
            marginRate: itemMarginRate,
            tauxTva: parseFloat(tauxTva),
        },
        lotMarginRate,
        projectDefaultMarginRate,
    );

    const effectiveMarginPct = (pricing.effectiveMarginRate * 100).toFixed(0);
    const inheritedMarginLabel = !marginRateStr
        ? lotMarginRate != null
            ? `Hérité du lot (${(lotMarginRate * 100).toFixed(0)} %)`
            : projectDefaultMarginRate != null
              ? `Hérité du projet (${(projectDefaultMarginRate * 100).toFixed(0)} %)`
              : "0 %"
        : null;

    const hasCost = pricing.totalCostHt > 0;

    // ─── Save ─────────────────────────────────────────────
    async function save() {
        setSaving(true);
        setError("");
        const data = {
            name,
            description,
            unit,
            quantity,
            workPackageId,
            puEstimeHt,
            puSubcontractorHt,
            quantitySubcontractor,
            marginRate: marginRateStr ? (parseFloat(marginRateStr) / 100).toString() : "",
            tauxTva,
        };
        let result: { error?: string };
        if (editItem) {
            result = await updateWorkItem(orgSlug, projectSlug, editItem.id, data);
        } else {
            result = await createWorkItem(orgSlug, projectSlug, { ...data, spaceId });
        }
        setSaving(false);
        if (result.error) {
            setError(result.error);
        } else {
            onRefresh();
            onOpenChange(false);
        }
    }

    const title = editItem ? "Modifier l'ouvrage" : spaceName ? `Ouvrage dans "${spaceName}"` : "Nouvel ouvrage";
    const desc = editItem
        ? "Modifiez les informations de l'ouvrage."
        : "Définissez les informations de base de cet ouvrage.";

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
            <SheetContent className="overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>{desc}</SheetDescription>
                </SheetHeader>

                <div className="mt-8 space-y-5 px-1 pb-8">
                    {/* ─── Informations générales ─── */}
                    <div className="space-y-2">
                        <Label>Nom *</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="ex : Peinture murs, Carrelage sol…"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Détails optionnels"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Quantité *</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unité *</Label>
                            <Input
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                placeholder="m², ml, u, h…"
                            />
                        </div>
                    </div>

                    {workPackages.length > 0 && (
                        <div className="space-y-2">
                            <Label>Lot</Label>
                            <select
                                value={workPackageId}
                                onChange={(e) => setWorkPackageId(e.target.value)}
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">— Aucun lot —</option>
                                {workPackages.map((wp) => {
                                    const color = wp.color ? LOT_COLOR_MAP[wp.color as LotColorKey] : null;
                                    return (
                                        <option key={wp.id} value={wp.id}>
                                            {color ? "● " : ""}{wp.name}
                                            {wp.marginRate ? ` (${(parseFloat(wp.marginRate) * 100).toFixed(0)} %)` : ""}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

                    {/* ─── Section financière ─── */}
                    <div className="border-t border-border pt-5 space-y-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Financier
                        </p>

                        {/* Coût estimé */}
                        <div className="space-y-2">
                            <Label>Prix unitaire estimé (€ HT)</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={puEstimeHt}
                                onChange={(e) => setPuEstimeHt(e.target.value)}
                                placeholder="0,00"
                            />
                            {puEstimeHt && parseFloat(puEstimeHt) > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {quantity} {unit} × {parseFloat(puEstimeHt).toFixed(2)} € ={" "}
                                    <span className="font-medium">{formatCurrency(pricing.totalEstimeHt)}</span>
                                </p>
                            )}
                        </div>

                        {/* Sous-traitant */}
                        <div className="space-y-2">
                            <Label>Sous-traitant (€ HT)</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Prix unitaire</p>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={puSubcontractorHt}
                                        onChange={(e) => setPuSubcontractorHt(e.target.value)}
                                        placeholder="0,00"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Quantité</p>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={quantitySubcontractor}
                                        onChange={(e) => setQuantitySubcontractor(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            {pricing.totalSubcontractorHt > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Total sous-traitant ={" "}
                                    <span className="font-medium">{formatCurrency(pricing.totalSubcontractorHt)}</span>
                                </p>
                            )}
                        </div>

                        {/* Synthèse : coût, marge, vente */}
                        <div className="rounded-md border border-border bg-subtle p-3 space-y-2.5 text-sm">
                            {/* Coût de revient */}
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Coût de revient HT</span>
                                <span className={hasCost ? "font-medium" : "text-muted-foreground"}>
                                    {hasCost ? formatCurrency(pricing.totalCostHt) : "—"}
                                </span>
                            </div>

                            {/* Marge */}
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground flex-1">Marge</span>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        type="number"
                                        min="0"
                                        max="500"
                                        step="1"
                                        value={marginRateStr}
                                        onChange={(e) => setMarginRateStr(e.target.value)}
                                        placeholder={inheritedMarginLabel ?? "0"}
                                        className="w-20 h-7 text-right text-sm"
                                    />
                                    <span className="text-muted-foreground text-xs">%</span>
                                </div>
                            </div>
                            {inheritedMarginLabel && (
                                <p className="text-xs text-muted-foreground -mt-1">
                                    {inheritedMarginLabel}
                                </p>
                            )}
                            {marginRateStr && (
                                <p className="text-xs text-muted-foreground -mt-1">
                                    Coefficient × {(1 + parseFloat(marginRateStr) / 100).toFixed(2)}
                                </p>
                            )}

                            <div className="border-t border-border" />

                            {/* Prix HT affiché */}
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                    Prix vendu HT
                                    {hasCost && (
                                        <span className="ml-1 text-xs">
                                            (+{effectiveMarginPct} %)
                                        </span>
                                    )}
                                </span>
                                <span className={hasCost ? "font-medium" : "text-muted-foreground"}>
                                    {hasCost ? formatCurrency(pricing.totalAfficheHt) : "—"}
                                </span>
                            </div>

                            {/* TVA */}
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground flex-1">TVA</span>
                                <select
                                    value={tauxTva}
                                    onChange={(e) => setTauxTva(e.target.value as typeof tauxTva)}
                                    className="h-7 rounded border border-border bg-background text-sm px-2 focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {TVA_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Total TTC */}
                            <div className="flex justify-between items-center font-medium border-t border-border pt-2">
                                <span>Total TTC</span>
                                <span>{hasCost ? formatCurrency(pricing.totalTtc) : "—"}</span>
                            </div>

                            {/* Marge brute */}
                            {hasCost && pricing.margeEuros > 0 && (
                                <p className="text-xs text-muted-foreground text-right">
                                    Marge brute : {formatCurrency(pricing.margeEuros)}
                                </p>
                            )}
                        </div>
                    </div>

                    {error && <p className="text-error">{error}</p>}

                    <Button
                        onClick={save}
                        disabled={saving || !name.trim() || !unit.trim()}
                        className="w-full"
                    >
                        {saving ? "Enregistrement…" : editItem ? "Mettre à jour" : "Créer l'ouvrage"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
