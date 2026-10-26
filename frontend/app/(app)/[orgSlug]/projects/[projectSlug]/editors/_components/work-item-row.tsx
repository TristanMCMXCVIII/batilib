"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkItemItem, WorkItemStatus } from "@/lib/actions/project-editor";
import { deleteWorkItem, updateWorkItemStatus } from "@/lib/actions/project-editor";
import { LOT_COLOR_MAP, type LotColorKey } from "@/lib/lot-colors";
import { useEditor } from "./editor-context";
import WorkItemFormSheet from "./work-item-form-sheet";

const STATUS_LABELS: Record<WorkItemStatus, string> = {
    DRAFT: "Brouillon",
    IN_PROGRESS: "En cours",
    DONE: "Terminé",
    CANCELLED: "Annulé",
};

const STATUS_VARIANTS: Record<WorkItemStatus, "neutral" | "info" | "success" | "destructive"> = {
    DRAFT: "neutral",
    IN_PROGRESS: "info",
    DONE: "success",
    CANCELLED: "destructive",
};

const STATUS_ORDER: WorkItemStatus[] = ["DRAFT", "IN_PROGRESS", "DONE", "CANCELLED"];

type Props = {
    item: WorkItemItem;
    spaceId: string | null;
};

export default function WorkItemRow({ item, spaceId }: Props) {
    const { orgSlug, projectSlug, onRefresh } = useEditor();
    const [editOpen, setEditOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: `item-${item.id}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
    };

    async function handleDelete() {
        setDeleting(true);
        await deleteWorkItem(orgSlug, projectSlug, item.id);
        onRefresh();
        setDeleting(false);
    }

    async function handleStatusChange(status: WorkItemStatus) {
        await updateWorkItemStatus(orgSlug, projectSlug, item.id, status);
        onRefresh();
    }

    const lotColor = item.workPackageColor ? LOT_COLOR_MAP[item.workPackageColor as LotColorKey] : null;

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                className={`group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-subtle transition-colors ${deleting ? "opacity-50 pointer-events-none" : ""}`}
            >
                {/* Drag handle */}
                <button
                    {...listeners}
                    className="opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground transition-opacity shrink-0"
                    tabIndex={-1}
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </button>

                {/* Name */}
                <span className="flex-1 body-sm font-medium truncate">{item.name}</span>

                {/* Lot dot */}
                {lotColor && (
                    <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: lotColor.hex }}
                        title={item.workPackageName ?? ""}
                    />
                )}

                {/* Quantity + unit */}
                <span className="caption shrink-0">
                    {item.quantity} {item.unit}
                </span>

                {/* Status */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="shrink-0">
                            <Badge variant={STATUS_VARIANTS[item.status]} className="text-xs cursor-pointer">
                                {STATUS_LABELS[item.status]}
                            </Badge>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                        {STATUS_ORDER.map((s) => (
                            <DropdownMenuItem
                                key={s}
                                onClick={() => handleStatusChange(s)}
                                className={item.status === s ? "font-medium" : ""}
                            >
                                <Badge variant={STATUS_VARIANTS[s]} className="text-xs mr-2">
                                    {STATUS_LABELS[s]}
                                </Badge>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* More actions */}
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
                    <DropdownMenuContent align="end" className="w-40">
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

            <WorkItemFormSheet
                open={editOpen}
                onOpenChange={setEditOpen}
                spaceId={spaceId}
                spaceName={null}
                editItem={item}
            />
        </>
    );
}

// Overlay used during drag (no interactive elements)
export function WorkItemRowOverlay({ item }: { item: WorkItemItem }) {
    const lotColor = item.workPackageColor ? LOT_COLOR_MAP[item.workPackageColor as LotColorKey] : null;
    return (
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-background border border-border shadow-md opacity-95">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 body-sm font-medium truncate">{item.name}</span>
            {lotColor && (
                <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: lotColor.hex }} />
            )}
            <span className="caption shrink-0">{item.quantity} {item.unit}</span>
            <Badge variant={STATUS_VARIANTS[item.status]} className="text-xs shrink-0">
                {STATUS_LABELS[item.status]}
            </Badge>
        </div>
    );
}
