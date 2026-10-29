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
    createWorkPackage,
    updateWorkPackage,
    type WorkPackageItem,
} from "@/lib/actions/project-editor";
import { LOT_COLORS, type LotColorKey } from "@/lib/lot-colors";
import { useEditor } from "./editor-context";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    editPkg?: WorkPackageItem;
};

export default function WorkPackageFormSheet({ open, onOpenChange, editPkg }: Props) {
    const { orgSlug, projectSlug, onRefresh } = useEditor();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState<LotColorKey | "">("");
    const [marginRateStr, setMarginRateStr] = useState(""); // ex : "30" pour 30 %
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setName(editPkg?.name ?? "");
            setDescription(editPkg?.description ?? "");
            setColor((editPkg?.color as LotColorKey) ?? "");
            setMarginRateStr(
                editPkg?.marginRate ? (parseFloat(editPkg.marginRate) * 100).toFixed(0) : "",
            );
            setError("");
        }
    }, [open, editPkg]);

    async function save() {
        setSaving(true);
        setError("");
        let result: { error?: string };
        const marginRate = marginRateStr ? (parseFloat(marginRateStr) / 100).toString() : "";
        if (editPkg) {
            result = await updateWorkPackage(orgSlug, projectSlug, editPkg.id, {
                name,
                description,
                color,
                marginRate,
            });
        } else {
            result = await createWorkPackage(orgSlug, projectSlug, {
                name,
                description,
                color,
                marginRate,
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

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{editPkg ? "Modifier le lot" : "Nouveau lot"}</SheetTitle>
                    <SheetDescription>
                        {editPkg
                            ? "Modifiez les informations de ce lot."
                            : "Créez un lot pour regrouper des ouvrages par corps de métier."}
                    </SheetDescription>
                </SheetHeader>
                <div className="mt-8 space-y-5 px-1">
                    <div className="space-y-2">
                        <Label>Nom *</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="ex : Plomberie, Électricité, Peinture…"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description optionnelle"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Couleur</Label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setColor("")}
                                className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-muted-foreground text-xs transition-all ${
                                    color === ""
                                        ? "border-foreground bg-subtle"
                                        : "border-border hover:border-muted-foreground"
                                }`}
                                title="Aucune couleur"
                            >
                                ×
                            </button>
                            {LOT_COLORS.map((c) => (
                                <button
                                    key={c.key}
                                    type="button"
                                    onClick={() => setColor(c.key)}
                                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                                        color === c.key
                                            ? "border-foreground scale-110"
                                            : "border-transparent hover:scale-105"
                                    }`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Marge du lot (%)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={marginRateStr}
                                onChange={(e) => setMarginRateStr(e.target.value)}
                                placeholder="ex : 30"
                                className="w-28"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                            {marginRateStr && (
                                <span className="text-xs text-muted-foreground">
                                    × {(1 + parseFloat(marginRateStr) / 100).toFixed(2)}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Appliquée à chaque ouvrage du lot (sauf override sur l&apos;ouvrage).
                        </p>
                    </div>

                    {error && <p className="text-error">{error}</p>}

                    <Button onClick={save} disabled={saving || !name.trim()} className="w-full">
                        {saving ? "Enregistrement…" : editPkg ? "Mettre à jour" : "Créer le lot"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
