"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Tag, Trash2 } from "lucide-react";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    createTradeCategory,
    updateTradeCategory,
    deleteTradeCategory,
    type TradeCategoryItem,
} from "@/lib/actions/trade-categories";

type Props = { categories: TradeCategoryItem[] };

const EMPTY_FORM = { code: "", label: "" };

export default function TradeCategoryClient({ categories }: Props) {
    const router = useRouter();

    // Sheet
    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<"create" | "edit">("create");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [sheetError, setSheetError] = useState<string | null>(null);

    // Dialog suppression
    const [deleteTarget, setDeleteTarget] = useState<TradeCategoryItem | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    function openCreate() {
        setMode("create");
        setEditingId(null);
        setForm(EMPTY_FORM);
        setSheetError(null);
        setSheetOpen(true);
    }

    function openEdit(cat: TradeCategoryItem) {
        setMode("edit");
        setEditingId(cat.id);
        setForm({ code: cat.code, label: cat.label });
        setSheetError(null);
        setSheetOpen(true);
    }

    async function handleSave() {
        setSaving(true);
        setSheetError(null);
        try {
            const res =
                mode === "create"
                    ? await createTradeCategory(form.code, form.label)
                    : await updateTradeCategory(editingId!, form.code, form.label);
            if (res.error) { setSheetError(res.error); return; }
            setSheetOpen(false);
            router.refresh();
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            const res = await deleteTradeCategory(deleteTarget.id);
            if (res.error) { setDeleteError(res.error); return; }
            setDeleteTarget(null);
            router.refresh();
        } finally {
            setDeleting(false);
        }
    }

    return (
        <main className="py-8 max-w-2xl">
            {/* En-tête */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h2 className="section-title">Catégories de métiers</h2>
                    <p className="caption mt-1">
                        Référentiel global des corps d&apos;état et métiers du bâtiment.
                    </p>
                </div>
                <Button size="sm" onClick={openCreate} className="shrink-0 ml-6 mt-0.5">
                    <Plus className="h-3.5 w-3.5" />
                    Nouvelle catégorie
                </Button>
            </div>

            {/* Contenu */}
            {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-20 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                        <Tag className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="body-sm font-medium">Aucune catégorie</p>
                    <p className="mt-1 caption max-w-xs">
                        Ajoutez les corps d&apos;état utilisés dans vos projets (maçonnerie, électricité, plomberie…).
                    </p>
                    <Button size="sm" variant="outline" className="mt-6" onClick={openCreate}>
                        <Plus className="h-3.5 w-3.5" />
                        Nouvelle catégorie
                    </Button>
                </div>
            ) : (
                <div>
                    <p className="caption mb-3">
                        {categories.length} catégorie{categories.length > 1 ? "s" : ""}
                    </p>
                    <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-subtle border-b border-border">
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">
                                        Code
                                    </th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                        Libellé
                                    </th>
                                    <th className="w-20 px-2" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {categories.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-subtle/50 transition-colors group">
                                        <td className="px-4 py-3 font-mono text-xs font-medium text-muted-foreground tracking-wide">
                                            {cat.code}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            {cat.label}
                                        </td>
                                        <td className="px-2 py-3">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEdit(cat)}
                                                    className="p-1.5 rounded hover:bg-hover transition-colors"
                                                    aria-label="Modifier"
                                                >
                                                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                                </button>
                                                <button
                                                    onClick={() => { setDeleteError(null); setDeleteTarget(cat); }}
                                                    className="p-1.5 rounded hover:bg-hover transition-colors"
                                                    aria-label="Supprimer"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Sheet création / édition */}
            <Sheet open={sheetOpen} onOpenChange={(o) => { if (!saving) setSheetOpen(o); }}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>
                            {mode === "create" ? "Nouvelle catégorie" : "Modifier la catégorie"}
                        </SheetTitle>
                        <SheetDescription>
                            {mode === "create"
                                ? "Ajoutez un corps d'état au référentiel global."
                                : "Modifiez le code ou le libellé de cette catégorie."}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="mt-8 space-y-5 px-1">
                        <div className="space-y-2">
                            <Label htmlFor="tc-code">
                                Code <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="tc-code"
                                value={form.code}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                                }
                                placeholder="Ex : ELEC"
                                className="font-mono uppercase"
                            />
                            <p className="caption">Identifiant court et unique, automatiquement mis en majuscules.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tc-label">
                                Libellé <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="tc-label"
                                value={form.label}
                                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                                placeholder="Ex : Électricité"
                            />
                        </div>

                        {sheetError && <p className="text-error">{sheetError}</p>}

                        <Button onClick={handleSave} disabled={saving} className="w-full">
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enregistrement…
                                </>
                            ) : mode === "create" ? (
                                "Créer la catégorie"
                            ) : (
                                "Enregistrer"
                            )}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Dialog suppression */}
            <Dialog
                open={!!deleteTarget}
                onOpenChange={(o) => { if (!deleting) { if (!o) setDeleteTarget(null); } }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-destructive">Attention</p>
                            <DialogTitle>Supprimer la catégorie</DialogTitle>
                        </div>
                        <DialogDescription>
                            La catégorie{" "}
                            <span className="font-medium text-foreground">
                                {deleteTarget?.label}
                            </span>{" "}
                            ({deleteTarget?.code}) sera supprimée définitivement. Les ouvrages et lots
                            qui l&apos;utilisent seront dissociés, mais conservés.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteError && <p className="text-error text-sm">{deleteError}</p>}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                            disabled={deleting}
                        >
                            Annuler
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Suppression…
                                </>
                            ) : (
                                "Supprimer"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
}
