"use client";

import { useState } from "react";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
import type { ProjectSpaceItem } from "@/lib/actions/project-editor";
import { deleteProjectSpace } from "@/lib/actions/project-editor";
import { useEditor } from "./editor-context";
import WorkItemRow from "./work-item-row";
import SpaceFormSheet from "./space-form-sheet";
import WorkItemFormSheet from "./work-item-form-sheet";
import LibraryPickerSheet from "./library-picker-sheet";

type Props = {
    space: ProjectSpaceItem;
    depth: number;
};

export default function SpaceSection({ space, depth }: Props) {
    const { orgSlug, projectSlug, onRefresh } = useEditor();
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
    const paddingLeft = depth * 20;

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

    return (
        <div ref={setNodeRef} style={{ ...style, paddingLeft }} {...attributes}>
            {/* Space header */}
            <div className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-subtle transition-colors">
                {/* Drag handle */}
                <button
                    {...listeners}
                    className="opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground transition-opacity"
                    tabIndex={-1}
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </button>

                {/* Expand/collapse */}
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="flex items-center gap-1.5 flex-1 text-left"
                >
                    <ChevronRight
                        className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
                    />
                    <span className="text-sm font-semibold text-foreground">{space.name}</span>
                    {(space.workItems.length > 0 || space.children.length > 0) && (
                        <span className="caption text-xs">
                            {space.workItems.length} ouvrage{space.workItems.length !== 1 ? "s" : ""}
                            {space.children.length > 0 && ` · ${space.children.length} sous-espace${space.children.length !== 1 ? "s" : ""}`}
                        </span>
                    )}
                </button>

                {/* Actions */}
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
                <p className="px-2 py-1 text-xs text-destructive">{deleteError}</p>
            )}

            {/* Content */}
            {open && (
                <div className="mt-0.5">
                    {/* Work items */}
                    {space.workItems.length > 0 && (
                        <div style={{ paddingLeft: paddingLeft + 28 }}>
                            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                                {space.workItems.map((item) => (
                                    <WorkItemRow key={item.id} item={item} spaceId={space.id} />
                                ))}
                            </SortableContext>
                        </div>
                    )}

                    {/* Add ouvrage button */}
                    <div style={{ paddingLeft: paddingLeft + 28 }} className="py-0.5">
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
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setAddSubSpaceOpen(true)}>
                                    <span className="text-sm">Ajouter un sous-espace</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Children spaces */}
                    {space.children.length > 0 && (
                        <div className="mt-1">
                            <SortableContext
                                items={space.children.map((c) => `space-${c.id}`)}
                                strategy={verticalListSortingStrategy}
                            >
                                {space.children.map((child) => (
                                    <SpaceSection key={child.id} space={child} depth={depth + 1} />
                                ))}
                            </SortableContext>
                        </div>
                    )}
                </div>
            )}

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
