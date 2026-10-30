"use client";

import { useState } from "react";
import { ChevronRight, FolderOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import type { LibraryFolderItem, WorkItemTemplateItem } from "@/lib/actions/work-item-templates";
import { createWorkItem } from "@/lib/actions/project-editor";
import { useEditor } from "./editor-context";

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    spaceId: string | null;
    spaceName: string | null;
    defaultWorkPackageId?: string;
};

export default function LibraryPickerSheet({ open, onOpenChange, spaceId, spaceName, defaultWorkPackageId }: Props) {
    const { orgSlug, projectSlug, libraryTree, workPackages, onRefresh } = useEditor();
    const [search, setSearch] = useState("");
    const [selectedFolder, setSelectedFolder] = useState<LibraryFolderItem | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function handleClose() {
        if (!saving) {
            setSearch("");
            setSelectedFolder(null);
            setError("");
            onOpenChange(false);
        }
    }

    // Flatten all items for search
    function flattenItems(folders: LibraryFolderItem[]): WorkItemTemplateItem[] {
        const result: WorkItemTemplateItem[] = [];
        function collect(f: LibraryFolderItem) {
            result.push(...f.items);
            f.children.forEach(collect);
        }
        folders.forEach(collect);
        return result;
    }

    const allItems = [...libraryTree.rootItems, ...flattenItems(libraryTree.folders)];
    const filteredItems = search.trim()
        ? allItems.filter((i) =>
              i.name.toLowerCase().includes(search.toLowerCase()) ||
              i.description?.toLowerCase().includes(search.toLowerCase()),
          )
        : selectedFolder
        ? selectedFolder.items
        : libraryTree.rootItems;

    const displayFolders = search.trim()
        ? []
        : selectedFolder
        ? selectedFolder.children
        : libraryTree.folders;

    async function pickTemplate(template: WorkItemTemplateItem) {
        setSaving(true);
        setError("");
        const result = await createWorkItem(orgSlug, projectSlug, {
            name: template.name,
            description: template.description ?? "",
            unit: template.unit,
            quantity: "1",
            workPackageId: defaultWorkPackageId ?? "",
            spaceId,
            templateId: template.id,
            // Pré-remplir depuis le template de bibliothèque
            puEstimeHt: template.estimatedUnitCost ?? "",
            puSubcontractorHt: "",
            quantitySubcontractor: "",
            marginRate: "",
            tauxTva: template.defaultTaxRate ?? "0.10",
        });
        setSaving(false);
        if (result.error) {
            setError(result.error);
        } else {
            onRefresh();
            handleClose();
        }
    }

    const title = spaceName ? `Bibliothèque → "${spaceName}"` : "Choisir depuis la bibliothèque";

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetContent className="w-full sm:max-w-lg flex flex-col">
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>
                        Sélectionnez un ouvrage de votre bibliothèque pour l'ajouter au projet.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-4 px-1 relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setSelectedFolder(null); }}
                        placeholder="Rechercher un ouvrage…"
                        className="pl-9"
                    />
                </div>

                {/* Breadcrumb */}
                {selectedFolder && !search && (
                    <div className="mt-2 px-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <button
                            onClick={() => setSelectedFolder(null)}
                            className="hover:text-foreground transition-colors"
                        >
                            Bibliothèque
                        </button>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-foreground font-medium">{selectedFolder.name}</span>
                    </div>
                )}

                <div className="flex-1 overflow-auto mt-3 px-1 space-y-0.5">
                    {/* Folders */}
                    {displayFolders.map((folder) => (
                        <button
                            key={folder.id}
                            onClick={() => setSelectedFolder(folder)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-subtle transition-colors text-left"
                        >
                            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="body-sm font-medium flex-1">{folder.name}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                    ))}

                    {/* Items */}
                    {filteredItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => pickTemplate(item)}
                            disabled={saving}
                            className="w-full flex items-start gap-2 px-3 py-2 rounded-md hover:bg-subtle transition-colors text-left disabled:opacity-50"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="body-sm font-medium truncate">{item.name}</p>
                                {item.description && (
                                    <p className="caption truncate">{item.description}</p>
                                )}
                            </div>
                            <span className="caption shrink-0 mt-0.5">{item.unit}</span>
                        </button>
                    ))}

                    {filteredItems.length === 0 && displayFolders.length === 0 && (
                        <div className="py-10 text-center">
                            <p className="body-sm text-muted-foreground">
                                {search ? "Aucun résultat" : "Aucun ouvrage dans cette section"}
                            </p>
                        </div>
                    )}
                </div>

                {error && <p className="px-1 text-error text-sm">{error}</p>}
            </SheetContent>
        </Sheet>
    );
}
