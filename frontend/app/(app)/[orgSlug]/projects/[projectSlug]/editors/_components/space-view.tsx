"use client";

import { useId, useState } from "react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectSpaceItem, WorkItemItem } from "@/lib/actions/project-editor";
import { reorderSpaces, reorderWorkItems } from "@/lib/actions/project-editor";
import { useEditor } from "./editor-context";
import SpaceSection from "./space-section";
import { WorkItemRowOverlay } from "./work-item-row";
import SpaceFormSheet from "./space-form-sheet";

type Props = {
    spaces: ProjectSpaceItem[];
    setSpaces: React.Dispatch<React.SetStateAction<ProjectSpaceItem[]>>;
};

export default function SpaceView({ spaces, setSpaces }: Props) {
    const dndId = useId();
    const { orgSlug, projectSlug, onRefresh } = useEditor();
    const [addSpaceOpen, setAddSpaceOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<WorkItemItem | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

    function findItemById(id: string): { item: WorkItemItem; spaceId: string | null } | null {
        function search(s: ProjectSpaceItem): { item: WorkItemItem; spaceId: string | null } | null {
            for (const item of s.workItems) {
                if (item.id === id) return { item, spaceId: s.id };
            }
            for (const child of s.children) {
                const found = search(child);
                if (found) return found;
            }
            return null;
        }
        for (const space of spaces) {
            const found = search(space);
            if (found) return found;
        }
        return null;
    }

    function onDragStart(event: DragStartEvent) {
        const id = String(event.active.id);
        if (id.startsWith("item-")) {
            const found = findItemById(id.slice(5));
            if (found) setActiveItem(found.item);
        }
    }

    function updateItemsInSpaces(
        tree: ProjectSpaceItem[],
        spaceId: string | null,
        updater: (items: WorkItemItem[]) => WorkItemItem[],
    ): ProjectSpaceItem[] {
        return tree.map((s) => {
            if (s.id === spaceId) {
                return { ...s, workItems: updater(s.workItems) };
            }
            return { ...s, children: updateItemsInSpaces(s.children, spaceId, updater) };
        });
    }

    async function onDragEnd(event: DragEndEvent) {
        setActiveItem(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        // Space reorder (root level only for now)
        if (activeId.startsWith("space-") && overId.startsWith("space-")) {
            const oldIndex = spaces.findIndex((s) => `space-${s.id}` === activeId);
            const newIndex = spaces.findIndex((s) => `space-${s.id}` === overId);
            if (oldIndex === -1 || newIndex === -1) return;
            const reordered = arrayMove(spaces, oldIndex, newIndex).map((s, i) => ({
                ...s,
                position: i + 1,
            }));
            setSpaces(reordered);
            await reorderSpaces(
                orgSlug,
                projectSlug,
                reordered.map((s) => ({ id: s.id, position: s.position, parentId: s.parentId })),
            );
            onRefresh();
            return;
        }

        // Item reorder within same space
        if (activeId.startsWith("item-") && overId.startsWith("item-")) {
            const activeItemId = activeId.slice(5);
            const overItemId = overId.slice(5);
            const found = findItemById(activeItemId);
            if (!found) return;
            const sourceSpaceId = found.spaceId;

            setSpaces((prev) =>
                updateItemsInSpaces(prev, sourceSpaceId, (items) => {
                    const oldIdx = items.findIndex((i) => i.id === activeItemId);
                    const newIdx = items.findIndex((i) => i.id === overItemId);
                    if (oldIdx === -1 || newIdx === -1) return items;
                    return arrayMove(items, oldIdx, newIdx).map((it, i) => ({
                        ...it,
                        position: i + 1,
                    }));
                }),
            );

            // Persist reorder — utilise l'état avant optimistic update pour calculer les positions
            const updatedItems = (() => {
                let result: WorkItemItem[] = [];
                function collect(s: ProjectSpaceItem) {
                    if (s.id === sourceSpaceId) result = s.workItems;
                    s.children.forEach(collect);
                }
                spaces.forEach(collect);
                return result;
            })();

            if (updatedItems.length) {
                const oldIdx = updatedItems.findIndex((i) => i.id === activeItemId);
                const newIdx = updatedItems.findIndex((i) => i.id === overItemId);
                const reorderedItems = arrayMove(updatedItems, oldIdx, newIdx).map((it, i) => ({
                    ...it,
                    position: i + 1,
                }));
                await reorderWorkItems(
                    orgSlug,
                    projectSlug,
                    reorderedItems.map((it) => ({
                        id: it.id,
                        position: it.position,
                        projectSpaceId: found.spaceId,
                        workPackageId: it.workPackageId,
                    })),
                );
                onRefresh();
            }
        }
    }

    const rootSpaceIds = spaces.map((s) => `space-${s.id}`);

    if (spaces.length === 0) {
        return (
            <div className="page-outer pt-10 pb-10">
                <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-20 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                        <Layers className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="body-sm font-medium">Aucun espace défini</p>
                    <p className="mt-1 caption max-w-xs">
                        Créez votre premier espace pour organiser les ouvrages du projet (ex : Salon, Cuisine, Chambre…)
                    </p>
                    <Button size="sm" variant="outline" className="mt-6" onClick={() => setAddSpaceOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Créer un espace
                    </Button>
                </div>
                <SpaceFormSheet
                    open={addSpaceOpen}
                    onOpenChange={setAddSpaceOpen}
                    parentId={null}
                    parentName={null}
                />
            </div>
        );
    }

    return (
        <DndContext
            id={dndId}
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div className="page-outer pt-6 pb-10 space-y-2">
                <SortableContext items={rootSpaceIds} strategy={verticalListSortingStrategy}>
                    {spaces.map((space) => (
                        <SpaceSection
                            key={space.id}
                            space={space}
                            depth={0}
                        />
                    ))}
                </SortableContext>

                <div className="pt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setAddSpaceOpen(true)}
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Ajouter un espace
                    </Button>
                </div>
            </div>

            <DragOverlay>
                {activeItem && <WorkItemRowOverlay item={activeItem} />}
            </DragOverlay>

            <SpaceFormSheet
                open={addSpaceOpen}
                onOpenChange={setAddSpaceOpen}
                parentId={null}
                parentName={null}
            />
        </DndContext>
    );
}
