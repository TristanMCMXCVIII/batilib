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
import { createProjectSpace, renameProjectSpace } from "@/lib/actions/project-editor";
import { useEditor } from "./editor-context";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    parentId: string | null;
    parentName: string | null;
    editSpace?: { id: string; name: string };
};

export default function SpaceFormSheet({ open, onOpenChange, parentId, parentName, editSpace }: Props) {
    const { orgSlug, projectSlug, onRefresh } = useEditor();
    const [name, setName] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (open) {
            setName(editSpace?.name ?? "");
            setError("");
        }
    }, [open, editSpace]);

    async function save() {
        setSaving(true);
        setError("");
        let result: { error?: string };
        if (editSpace) {
            result = await renameProjectSpace(orgSlug, projectSlug, editSpace.id, name);
        } else {
            result = await createProjectSpace(orgSlug, projectSlug, { name, parentId });
        }
        setSaving(false);
        if (result.error) {
            setError(result.error);
        } else {
            onRefresh();
            onOpenChange(false);
        }
    }

    const title = editSpace
        ? "Renommer l'espace"
        : parentName
        ? `Sous-espace dans "${parentName}"`
        : "Nouvel espace";

    const description = editSpace
        ? "Modifiez le nom de cet espace."
        : parentName
        ? `Créez un sous-espace à l'intérieur de "${parentName}".`
        : "Créez un nouvel espace pour organiser les ouvrages du projet.";

    return (
        <Sheet open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>{description}</SheetDescription>
                </SheetHeader>
                <div className="mt-8 space-y-5 px-1">
                    <div className="space-y-2">
                        <Label>Nom de l'espace</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="ex : Salon, Cuisine, RDC…"
                            onKeyDown={(e) => { if (e.key === "Enter") save(); }}
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-error">{error}</p>}
                    <Button onClick={save} disabled={saving || !name.trim()} className="w-full">
                        {saving ? "Enregistrement…" : editSpace ? "Renommer" : "Créer l'espace"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
