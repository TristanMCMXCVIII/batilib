"use client";

import { useMemo, useState } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical, MapPin, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectSpaceItem, WorkItemItem } from "@/lib/actions/project-editor";
import { deleteProjectSpace } from "@/lib/actions/project-editor";
import { computeWorkItemFinancials, workItemToInput, formatPrice, formatPercent } from "@/lib/pricing";
import { useEditor } from "./editor-context";
import WorkItemRow from "./work-item-row";
import SpaceFormSheet from "./space-form-sheet";
import WorkItemFormSheet from "./work-item-form-sheet";
import LibraryPickerSheet from "./library-picker-sheet";

type Props = {
    space: ProjectSpaceItem;
    depth: number;
};

function flattenItems(s: ProjectSpaceItem): WorkItemItem[] {
    return [...s.workItems, ...s.children.flatMap(flattenItems)];
}

export default function SpaceSection({ space, depth }: Props) {
    const { orgSlug, projectSlug, workPackages, projectDefaultMarginRate, priceMode, onRefresh } = useEditor();

    const spaceTotals = useMemo(() => {
        const items = flattenItems(space);
        let totalAfficheHt = 0;
        let totalCostHt = 0;
        let totalTtc = 0;
        for (const item of items) {
            const wp = workPackages.find((p) => p.id === item.workPackageId);
            const lotRate = wp?.marginRate ? parseFloat(wp.marginRate) : null;
            const r = computeWorkItemFinancials(workItemToInput(item), lotRate, projectDefaultMarginRate);
            totalAfficheHt += r.totalAfficheHt;
            totalCostHt += r.totalCostHt;
            totalTtc += r.totalTtc;
        }
        const effectiveMarkup = totalCostHt > 0 ? (totalAfficheHt - totalCostHt) / totalCostHt : 0;
        const margeEuros = totalAfficheHt - totalCostHt;
        return { totalAfficheHt, totalCostHt, totalTtc, effectiveMarkup, margeEuros };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [space, workPackages, projectDefaultMarginRate]);

    const [open, setOpen] = useState(true);
    const [addSubSpaceOpen, setAddSubSpaceOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [addItemOpen, setAddItemOpen] = useState(false);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `space-${space.id}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const itemIds = space.workItems.map((i) => `item-${i.id}`);

    async function handleDelete() {
        setDeleting(true);
        setDeleteError("");
        const result = await deleteProjectSpace(orgSlug, projectSlug, space.id);
        if (result.error) {
            setDeleteError(result.error);
            setDeleting(false);
        } else {
            onRefresh();
        }
    }

    const totalItems = flattenItems(space).length;

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="mb-3">
            <div
                className="rounded-lg border border-border bg-neutral-100/30 overflow-hidden"
                style={{ marginLeft: depth * 20 }}
            >
                {/* En-tête de l'espace */}
                <div className="group flex items-center gap-2 px-3 py-3">
                    {/* Poignée */}
                    <button
                        {...listeners}
                        className="opacity-20 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground transition-opacity shrink-0"
                        tabIndex={-1}
                    >
                        <GripVertical className="h-3.5 w-3.5" />
                    </button>

                    {/* Expand + icône + nom */}
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                    >
                        <ChevronRight
                            className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
                        />
                        <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span className="text-base font-semibold text-foreground truncate">
                            {space.name}
                        </span>
                        {totalItems > 0 && (
                            <span className="caption text-xs shrink-0">
                                {totalItems} ouvrage{totalItems !== 1 ? "s" : ""}
                                {space.children.length > 0 &&
                                    ` · ${space.children.length} sous-espace${space.children.length !== 1 ? "s" : ""}`}
                            </span>
                        )}
                    </button>

                    {/* Total espace */}
                    {spaceTotals.totalAfficheHt > 0 && (
                        <div className="text-right shrink-0 mr-1">
                            <p className="text-base font-bold text-foreground tabular-nums leading-tight">
                                {formatPrice(priceMode === "ttc" ? spaceTotals.totalTtc : spaceTotals.totalAfficheHt)}
                                <sup className="text-[0.6em] font-semibold ml-0.5 tracking-wide">
                                    {priceMode === "ttc" ? "TTC" : "HT"}
                                </sup>
                            </p>
                            {spaceTotals.totalCostHt > 0 && (
                                <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                                    Coût {formatPrice(spaceTotals.totalCostHt)}
                                    <sup className="text-[0.6em] font-semibold ml-0.5">HT</sup>
                                </p>
                            )}
                            {spaceTotals.effectiveMarkup > 0 && spaceTotals.margeEuros > 0 && (
                                <p className="text-xs text-muted-foreground tabular-nums">
                                    marge {formatPrice(spaceTotals.margeEuros)}
                                    <sup className="text-[0.6em] font-semibold ml-0.5">HT</sup>
                                    {" "}({formatPercent(spaceTotals.effectiveMarkup)})
                                </p>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                Renommer
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAddSubSpaceOpen(true)}>
                                <Plus className="h-3.5 w-3.5 mr-2" />
                                Sous-espace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleDelete}
                                disabled={deleting}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Supprimer
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {deleteError && (
                    <p className="px-3 py-1 text-xs text-destructive">{deleteError}</p>
                )}

                {/* Contenu */}
                {open && (
                    <div className="border-t border-border">
                        {/* Ouvrages */}
                        {space.workItems.length > 0 && (
                            <div className="px-3 pt-2">
                                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                                    {space.workItems.map((item) => (
                                        <WorkItemRow key={item.id} item={item} spaceId={space.id} />
                                    ))}
                                </SortableContext>
                            </div>
                        )}

                        {/* Bouton ajouter */}
                        <div className="px-3 pt-1 pb-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 text-xs">
                                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                                        Ajouter
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-52">
                                    <DropdownMenuItem onClick={() => setLibraryOpen(true)}>
                                        <span className="text-sm">Depuis la bibliothèque</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setAddItemOpen(true)}>
                                        <span className="text-sm">Créer un ouvrage</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setAddSubSpaceOpen(true)}>
                                        <span className="text-sm">Ajouter un sous-espace</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Sous-espaces */}
                        {space.children.length > 0 && (
                            <div className="px-3 pb-3">
                                <div className="border-l-2 border-border/60 ml-3 pl-3">
                                    <SortableContext
                                        items={space.children.map((c) => `space-${c.id}`)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {space.children.map((child) => (
                                            <SpaceSection key={child.id} space={child} depth={0} />
                                        ))}
                                    </SortableContext>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sheets */}
            <SpaceFormSheet
                open={addSubSpaceOpen}
                onOpenChange={setAddSubSpaceOpen}
                parentId={space.id}
                parentName={space.name}
            />
            <SpaceFormSheet
                open={renameOpen}
                onOpenChange={setRenameOpen}
                parentId={space.parentId}
                parentName={null}
                editSpace={{ id: space.id, name: space.name }}
            />
            <WorkItemFormSheet
                open={addItemOpen}
                onOpenChange={setAddItemOpen}
                spaceId={space.id}
                spaceName={space.name}
            />
            <LibraryPickerSheet
                open={libraryOpen}
                onOpenChange={setLibraryOpen}
                spaceId={space.id}
                spaceName={space.name}
            />
        </div>
    );
}
