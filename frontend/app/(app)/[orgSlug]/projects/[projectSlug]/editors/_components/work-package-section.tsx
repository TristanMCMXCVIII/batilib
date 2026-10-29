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
import { computeLotTotals, formatCurrency } from "@/lib/pricing";
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
        <div ref={setNodeRef} style={style} {...attributes}>
            {deleteError && (
                <p className="px-2 py-1 text-xs text-destructive">{deleteError}</p>
            )}
            {/* Package header */}
            <div className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-subtle transition-colors">
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
                        {pkg.marginRate && ` · ×${(1 + parseFloat(pkg.marginRate)).toFixed(2)}`}
                        {totals.totalAfficheHt > 0 && ` · ${formatCurrency(totals.totalAfficheHt)} HT`}
                    </span>
                </button>

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

            {open && (
                <div className="pl-7">
                    {pkg.workItems.length > 0 && (
                        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                            {pkg.workItems.map((item) => (
                                <WorkItemRow key={item.id} item={item} spaceId={item.projectSpaceId} />
                            ))}
                        </SortableContext>
                    )}

                    <div className="py-0.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
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
