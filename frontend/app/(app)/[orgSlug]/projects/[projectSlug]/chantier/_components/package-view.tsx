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
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkItemItem, WorkPackageItem } from "@/lib/actions/project-editor";
import { reorderWorkItems } from "@/lib/actions/project-editor";
import { useEditor } from "./editor-context";
import WorkPackageSection from "./work-package-section";
import { WorkItemRowOverlay } from "./work-item-row";
import WorkPackageFormSheet from "./work-package-form-sheet";

type Props = {
    workPackages: WorkPackageItem[];
    setWorkPackages: React.Dispatch<React.SetStateAction<WorkPackageItem[]>>;
};

export default function PackageView({ workPackages, setWorkPackages }: Props) {
    const dndId = useId();
    const { orgSlug, projectSlug, onRefresh } = useEditor();
    const [addPkgOpen, setAddPkgOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<WorkItemItem | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

    function findItemById(id: string): { item: WorkItemItem; pkgId: string | null } | null {
        for (const pkg of workPackages) {
            for (const item of pkg.workItems) {
                if (item.id === id) return { item, pkgId: pkg.id };
            }
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

    async function onDragEnd(event: DragEndEvent) {
        setActiveItem(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        if (activeId.startsWith("item-") && overId.startsWith("item-")) {
            const activeItemId = activeId.slice(5);
            const overItemId = overId.slice(5);
            const found = findItemById(activeItemId);
            if (!found) return;

            setWorkPackages((prev) =>
                prev.map((pkg) => {
                    if (pkg.id !== found.pkgId) return pkg;
                    const oldIdx = pkg.workItems.findIndex((i) => i.id === activeItemId);
                    const newIdx = pkg.workItems.findIndex((i) => i.id === overItemId);
                    if (oldIdx === -1 || newIdx === -1) return pkg;
                    return {
                        ...pkg,
                        workItems: arrayMove(pkg.workItems, oldIdx, newIdx).map((it, i) => ({
                            ...it,
                            position: i + 1,
                        })),
                    };
                }),
            );

            const pkg = workPackages.find((p) => p.id === found.pkgId);
            if (pkg) {
                const oldIdx = pkg.workItems.findIndex((i) => i.id === activeItemId);
                const newIdx = pkg.workItems.findIndex((i) => i.id === overItemId);
                const reordered = arrayMove(pkg.workItems, oldIdx, newIdx).map((it, i) => ({
                    ...it,
                    position: i + 1,
                }));
                await reorderWorkItems(
                    orgSlug,
                    projectSlug,
                    reordered.map((it) => ({
                        id: it.id,
                        position: it.position,
                        projectSpaceId: it.projectSpaceId,
                        workPackageId: found.pkgId,
                    })),
                );
                onRefresh();
            }
        }
    }

    if (workPackages.length === 0) {
        return (
            <div className="pt-10 pb-10">
                <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-20 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                        <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="body-sm font-medium">Aucun lot défini</p>
                    <p className="mt-1 caption max-w-xs">
                        Les lots permettent de regrouper des ouvrages par corps de métier et de les confier à des intervenants.
                    </p>
                    <Button size="sm" variant="outline" className="mt-6" onClick={() => setAddPkgOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Créer un lot
                    </Button>
                </div>
                <WorkPackageFormSheet open={addPkgOpen} onOpenChange={setAddPkgOpen} />
            </div>
        );
    }

    return (
        <DndContext id={dndId} sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="pt-6 pb-10 space-y-2">
                <SortableContext
                    items={workPackages.map((p) => `pkg-${p.id}`)}
                    strategy={verticalListSortingStrategy}
                >
                    {workPackages.map((pkg) => (
                        <WorkPackageSection key={pkg.id} pkg={pkg} />
                    ))}
                </SortableContext>

                <div className="pt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setAddPkgOpen(true)}
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Ajouter un lot
                    </Button>
                </div>
            </div>

            <DragOverlay>
                {activeItem && <WorkItemRowOverlay item={activeItem} />}
            </DragOverlay>

            <WorkPackageFormSheet open={addPkgOpen} onOpenChange={setAddPkgOpen} />
        </DndContext>
    );
}
