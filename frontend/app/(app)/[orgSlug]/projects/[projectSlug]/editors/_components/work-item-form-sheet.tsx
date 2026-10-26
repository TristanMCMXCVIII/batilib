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
    const { orgSlug, projectSlug, workPackages, onRefresh } = useEditor();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [unit, setUnit] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [workPackageId, setWorkPackageId] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setName(editItem?.name ?? "");
            setDescription(editItem?.description ?? "");
            setUnit(editItem?.unit ?? "");
            setQuantity(editItem?.quantity ?? "1");
            setWorkPackageId(editItem?.workPackageId ?? defaultWorkPackageId ?? "");
            setError("");
        }
    }, [open, editItem, defaultWorkPackageId]);

    async function save() {
        setSaving(true);
        setError("");
        let result: { error?: string };
        if (editItem) {
            result = await updateWorkItem(orgSlug, projectSlug, editItem.id, {
                name,
                description,
                unit,
                quantity,
                workPackageId,
            });
        } else {
            result = await createWorkItem(orgSlug, projectSlug, {
                name,
                description,
                unit,
                quantity,
                workPackageId,
                spaceId,
            });
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
    const description_ = editItem
        ? "Modifiez les informations de l'ouvrage."
        : "Définissez les informations de base de cet ouvrage.";

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>{description_}</SheetDescription>
                </SheetHeader>
                <div className="mt-8 space-y-5 px-1">
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
                            <Label>Lot (optionnel)</Label>
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
                                            {color ? `● ` : ""}{wp.name}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    )}

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
