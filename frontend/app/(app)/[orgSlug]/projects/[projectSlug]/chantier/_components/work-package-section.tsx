"use client";

import { useMemo, useState } from "react";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkPackageItem } from "@/lib/actions/project-editor";
import { deleteWorkPackage } from "@/lib/actions/project-editor";
import { LOT_COLOR_MAP, type LotColorKey } from "@/lib/lot-colors";
import { computeLotTotals, formatCurrency, formatPercent } from "@/lib/pricing";
import { useEditor } from "./editor-context";
import WorkItemRow from "./work-item-row";
import WorkItemFormSheet from "./work-item-form-sheet";
import LibraryPickerSheet from "./library-picker-sheet";
import WorkPackageFormSheet from "./work-package-form-sheet";

type Props = {
    pkg: WorkPackageItem;
};

export default function WorkPackageSection({ pkg }: Props) {
    const { orgSlug, projectSlug, projectDefaultMarginRate, onRefresh } = useEditor();
    const [open, setOpen] = useState(true);
    const [addItemOpen, setAddItemOpen] = useState(false);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `pkg-${pkg.id}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const color = pkg.color ? LOT_COLOR_MAP[pkg.color as LotColorKey] : null;
    const itemIds = pkg.workItems.map((i) => `item-${i.id}`);

    const lotMarginRate = pkg.marginRate ? parseFloat(pkg.marginRate) : null;
    const totals = useMemo(
        () => computeLotTotals(pkg.workItems, lotMarginRate, projectDefaultMarginRate),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pkg.workItems, lotMarginRate, projectDefaultMarginRate],
    );

    async function handleDelete() {
        setDeleting(true);
        setDeleteError("");
        const result = await deleteWorkPackage(orgSlug, projectSlug, pkg.id);
        if (result.error) {
            setDeleteError(result.error);
            setDeleting(false);
        } else {
            onRefresh();
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className="mb-3 rounded-lg border border-border bg-background overflow-hidden"
        >
            {deleteError && (
                <p className="px-3 py-1 text-xs text-destructive bg-destructive-bg">{deleteError}</p>
            )}

            {/* En-tête du lot */}
            <div className="flex items-stretch">
                {/* Barre couleur */}
                <div
                    className="w-[3px] shrink-0 self-stretch"
                    style={{ backgroundColor: color?.hex ?? "transparent" }}
                />

                <div className="group flex-1 flex items-center gap-1 px-2 py-2">
                    <button
                        {...listeners}
                        className="opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground transition-opacity"
                        tabIndex={-1}
                    >
                        <GripVertical className="h-3.5 w-3.5" />
                    </button>

                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="flex items-center gap-2 flex-1 text-left"
                    >
                        <ChevronRight
                            className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
                        />
                        {color && (
                            <span
                                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: color.hex }}
                            />
                        )}
                        <span className="text-sm font-semibold text-foreground">{pkg.name}</span>
                        <span className="caption text-xs">
                            {pkg.workItems.length} ouvrage{pkg.workItems.length !== 1 ? "s" : ""}
                            {pkg.marginRate &&
                                ` · marge ${formatPercent(parseFloat(pkg.marginRate))}`}
                        </span>
                    </button>

                    {/* Total HT affiché dans l'en-tête */}
                    {totals.totalAfficheHt > 0 && (
                        <span className="caption text-xs font-medium text-foreground shrink-0 mr-1">
                            {formatCurrency(totals.totalAfficheHt)} HT
                        </span>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setEditOpen(true)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" />
                                Modifier
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
            </div>

            {/* Strip de synthèse financière */}
            {open && totals.totalCostHt > 0 && (
                <div className="flex items-center gap-5 px-4 py-1.5 border-t border-border bg-subtle text-xs text-muted-foreground">
                    <span>
                        Coût{" "}
                        <span className="font-medium text-foreground">
                            {formatCurrency(totals.totalCostHt)}
                        </span>
                    </span>
                    {totals.totalAfficheHt > totals.totalCostHt && (
                        <span>
                            Marge{" "}
                            <span className="font-medium text-foreground">
                                {formatCurrency(totals.margeEuros)}
                            </span>
                        </span>
                    )}
                    <span>
                        HT{" "}
                        <span className="font-medium text-foreground">
                            {formatCurrency(totals.totalAfficheHt)}
                        </span>
                    </span>
                    <span>
                        TTC{" "}
                        <span className="font-medium text-foreground">
                            {formatCurrency(totals.totalTtc)}
                        </span>
                    </span>
                </div>
            )}

            {/* Ouvrages */}
            {open && (
                <div className="px-2 pt-2 pb-1">
                    {pkg.workItems.length > 0 && (
                        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                            {pkg.workItems.map((item) => (
                                <WorkItemRow key={item.id} item={item} spaceId={item.projectSpaceId} />
                            ))}
                        </SortableContext>
                    )}

                    <div className="pt-0.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                    Ajouter un ouvrage
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52">
                                <DropdownMenuItem onClick={() => setLibraryOpen(true)}>
                                    <span className="text-sm">Depuis la bibliothèque</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setAddItemOpen(true)}>
                                    <span className="text-sm">Créer un ouvrage</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            )}

            <WorkItemFormSheet
                open={addItemOpen}
                onOpenChange={setAddItemOpen}
                spaceId={null}
                spaceName={null}
                defaultWorkPackageId={pkg.id}
            />
            <LibraryPickerSheet
                open={libraryOpen}
                onOpenChange={setLibraryOpen}
                spaceId={null}
                spaceName={null}
                defaultWorkPackageId={pkg.id}
            />
            <WorkPackageFormSheet open={editOpen} onOpenChange={setEditOpen} editPkg={pkg} />
        </div>
    );
}
