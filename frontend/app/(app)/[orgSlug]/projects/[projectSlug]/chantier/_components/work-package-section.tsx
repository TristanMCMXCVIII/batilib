"use client";

import { useMemo, useState } from "react";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import { computeLotTotals, formatPrice, formatPercent } from "@/lib/pricing";
import { useEditor } from "./editor-context";
import WorkItemRow from "./work-item-row";
import WorkItemFormSheet from "./work-item-form-sheet";
import LibraryPickerSheet from "./library-picker-sheet";
import WorkPackageFormSheet from "./work-package-form-sheet";

function AssigneeChip({
    orgName,
    logoUrl,
    isAssigned,
}: {
    orgName: string;
    logoUrl: string | null;
    isAssigned: boolean;
}) {
    return (
        <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-hover transition-colors cursor-default"
            tabIndex={-1}
        >
            {logoUrl ? (
                <img
                    src={logoUrl}
                    alt=""
                    className="h-4 w-4 rounded object-cover shrink-0"
                />
            ) : (
                <span className="h-4 w-4 rounded bg-neutral-200 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none">
                        {orgName.charAt(0)}
                    </span>
                </span>
            )}
            <span className={`text-xs leading-none ${isAssigned ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {orgName}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>
    );
}

type Props = {
    pkg: WorkPackageItem;
};

export default function WorkPackageSection({ pkg }: Props) {
    const { orgSlug, projectSlug, projectDefaultMarginRate, leadOrg, priceMode, onRefresh } = useEditor();
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
            className="mb-3 rounded-lg border border-border bg-neutral-100/30 overflow-hidden"
        >
            {deleteError && (
                <p className="px-3 py-1 text-xs text-destructive bg-destructive-bg">{deleteError}</p>
            )}

            {/* En-tête du lot */}
            <div className="group flex items-start gap-1 px-2 py-2">
                {/* Grip */}
                <button
                    {...listeners}
                    className="opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground transition-opacity mt-0.5 shrink-0"
                    tabIndex={-1}
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </button>

                {/* Nom + chip — colonne */}
                <div className="flex-1 min-w-0">
                    {/* Ligne expand */}
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="flex items-center gap-2 w-full text-left"
                    >
                        <ChevronRight
                            className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
                        />
                        {color && (
                            <span
                                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: color.hex }}
                            />
                        )}
                        <span className="text-sm font-semibold text-foreground">{pkg.name}</span>
                        <span className="caption text-xs truncate">
                            {pkg.workItems.length} ouvrage{pkg.workItems.length !== 1 ? "s" : ""}
                            {pkg.marginRate &&
                                ` · marge ${formatPercent(parseFloat(pkg.marginRate))}`}
                        </span>
                    </button>

                    {/* Chip responsable */}
                    <div className="mt-1 ml-5">
                        <AssigneeChip
                            orgName={pkg.assignedOrgName ?? leadOrg.name}
                            logoUrl={pkg.assignedOrgLogoUrl ?? leadOrg.logoUrl}
                            isAssigned={!!pkg.assignedOrgName}
                        />
                    </div>
                </div>

                {/* Total lot */}
                {totals.totalAfficheHt > 0 && (
                    <div className="text-right shrink-0 mr-1">
                        <p className="text-base font-bold text-foreground tabular-nums leading-tight">
                            {formatPrice(priceMode === "ttc" ? totals.totalTtc : totals.totalAfficheHt)}
                            <sup className="text-[0.6em] font-semibold ml-0.5 tracking-wide">
                                {priceMode === "ttc" ? "TTC" : "HT"}
                            </sup>
                        </p>
                        {totals.totalCostHt > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                                Coût {formatPrice(totals.totalCostHt)}
                                <sup className="text-[0.6em] font-semibold ml-0.5">HT</sup>
                            </p>
                        )}
                        {totals.margeEuros > 0 && (
                            <p className="text-xs text-muted-foreground tabular-nums">
                                Marge {formatPrice(totals.margeEuros)}
                                <sup className="text-[0.6em] font-semibold ml-0.5">HT</sup>
                                {" "}({formatPercent(totals.totalCostHt > 0 ? totals.margeEuros / totals.totalCostHt : 0)})
                            </p>
                        )}
                    </div>
                )}

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
