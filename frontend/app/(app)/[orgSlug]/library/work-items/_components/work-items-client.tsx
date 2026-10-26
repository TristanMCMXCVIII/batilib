"use client";

import { useState, useCallback, useId, useEffect, createContext, useContext } from "react";
import {
    ChevronRight,
    Folder,
    FolderOpen,
    FileText,
    Plus,
    Pencil,
    Trash2,
    MoreHorizontal,
    Tag,
    Loader2,
    Package,
    X,
    GripVertical,
} from "lucide-react";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    type UniqueIdentifier,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    arrayMove,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    createWorkItemTemplate,
    updateWorkItemTemplate,
    deleteWorkItemTemplate,
    createFolder,
    renameFolder,
    setFolderWpt,
    deleteFolder,
    reorderItems,
    reorderFolders,
    type OrgRole,
    type WorkPackageTemplateRef,
    type WorkItemTemplateFormData,
    type WorkItemTemplateItem,
    type LibraryFolderItem,
    type LibraryTree,
} from "@/lib/actions/work-item-templates";
import { LOT_COLOR_MAP, type LotColorKey } from "@/lib/lot-colors";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────

type Props = {
    orgSlug: string;
    tree: LibraryTree;
    callerRole: OrgRole | null;
    workPackageTemplates: WorkPackageTemplateRef[];
};

type SheetState =
    | { type: "item-create"; folderId: string | null }
    | { type: "item-edit"; item: WorkItemTemplateItem }
    | { type: "folder-create"; parentId: string | null }
    | { type: "folder-rename"; folderId: string; currentName: string }
    | { type: "folder-wpt"; folderId: string; folderName: string; currentWptId: string | null };

type ItemsMap = Map<string | null, WorkItemTemplateItem[]>;
type FoldersMap = Map<string | null, LibraryFolderItem[]>;

// ─── Context partagé pour éviter prop-drilling dans la récursion ──

type LibraryCtx = {
    orgSlug: string;
    canEdit: boolean;
    itemsMap: ItemsMap;
    foldersMap: FoldersMap;
    expandedFolders: Set<string>;
    activeDragType: "item" | "folder" | null;
    toggleFolder: (id: string) => void;
    openCreateItem: (folderId: string | null) => void;
    openEditItem: (item: WorkItemTemplateItem) => void;
    handleDeleteItem: (id: string) => void;
    openCreateSubfolder: (parentId: string) => void;
    openRenameFolder: (folderId: string, currentName: string) => void;
    openSetWpt: (folderId: string, folderName: string, currentWptId: string | null) => void;
    handleRemoveWpt: (folderId: string) => void;
    handleDeleteFolder: (folderId: string) => void;
};

const LibraryContext = createContext<LibraryCtx>(null!);

// ─── Constantes ───────────────────────────────────────────

const EMPTY_ITEM_FORM: WorkItemTemplateFormData = {
    name: "",
    description: "",
    unit: "",
    defaultUnitPrice: "",
    estimatedUnitCost: "",
    defaultTaxRate: "",
};

const UNITS = ["m²", "m³", "ml", "h", "u", "kg", "t", "forfait"] as const;
const TAX_RATES = ["5.5", "10", "20"] as const;

// ─── Helpers ──────────────────────────────────────────────

function formatPrice(value: string | null): string {
    if (!value) return "—";
    const n = parseFloat(value);
    return isNaN(n) ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function flattenFolders(
    folders: LibraryFolderItem[],
    depth = 0,
): { id: string; name: string; depth: number }[] {
    return folders.flatMap((f) => [
        { id: f.id, name: f.name, depth },
        ...flattenFolders(f.children, depth + 1),
    ]);
}

function buildItemsMap(tree: LibraryTree): ItemsMap {
    const map: ItemsMap = new Map();
    map.set(null, [...tree.rootItems].sort((a, b) => a.position - b.position));
    function visit(folder: LibraryFolderItem) {
        map.set(folder.id, [...folder.items].sort((a, b) => a.position - b.position));
        folder.children.forEach(visit);
    }
    tree.folders.forEach(visit);
    return map;
}

function buildFoldersMap(tree: LibraryTree): FoldersMap {
    const map: FoldersMap = new Map();
    function visit(folders: LibraryFolderItem[], parentId: string | null) {
        map.set(parentId, [...folders].sort((a, b) => a.position - b.position));
        folders.forEach((f) => visit(f.children, f.id));
    }
    visit(tree.folders, null);
    return map;
}

// ─── SortableItemRow ──────────────────────────────────────

type ItemRowProps = {
    item: WorkItemTemplateItem;
    depth: number;
    isOverlay?: boolean;
};

function SortableItemRow({ item, depth, isOverlay }: ItemRowProps) {
    const { canEdit, openEditItem, handleDeleteItem } = useContext(LibraryContext);
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
        data: { type: "item", folderId: item.folderId },
    });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                paddingLeft: `${depth * 20 + 12}px`,
                opacity: isDragging ? 0 : 1,
            }}
            {...attributes}
            className={`group flex items-center gap-2 pr-3 py-2 bg-background hover:bg-subtle/40 transition-colors border-b border-border/40 last:border-0 ${isOverlay ? "shadow-lg rounded-lg border border-border" : ""}`}
        >
            {canEdit && (
                <button
                    {...listeners}
                    className="p-1 cursor-grab active:cursor-grabbing touch-none shrink-0 ml-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                </button>
            )}
            <FileText className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                {item.description && (
                    <p className="caption truncate mt-0.5">{item.description}</p>
                )}
            </div>
            <div className="flex items-center gap-4 shrink-0">
                <span className="caption w-10 text-right tabular-nums">{item.unit}</span>
                <span className="caption w-24 text-right tabular-nums">{formatPrice(item.defaultUnitPrice)}</span>
                {canEdit && !isOverlay && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditItem(item)} className="p-1.5 rounded hover:bg-hover transition-colors">
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 rounded hover:bg-hover transition-colors">
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── FolderNode (composant récursif) ──────────────────────

function FolderNode({ folder, depth }: { folder: LibraryFolderItem; depth: number }) {
    const {
        orgSlug,
        canEdit,
        itemsMap,
        foldersMap,
        expandedFolders,
        activeDragType,
        toggleFolder,
        openCreateItem,
        openCreateSubfolder,
        openRenameFolder,
        openSetWpt,
        handleRemoveWpt,
        handleDeleteFolder,
    } = useContext(LibraryContext);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
        id: folder.id,
        data: { type: "folder", parentId: folder.parentId ?? null },
    });

    const isExpanded = expandedFolders.has(folder.id);
    const childFolders = foldersMap.get(folder.id) ?? [];
    const childItems = itemsMap.get(folder.id) ?? [];
    const hasChildren = childFolders.length > 0 || childItems.length > 0;
    const isItemDraggedOver = isOver && activeDragType === "item";

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
            {...attributes}
        >
            {/* Ligne dossier */}
            <div
                className={`group flex items-center gap-2 pr-3 py-2 bg-subtle transition-colors cursor-pointer border-b border-border/40 ${isItemDraggedOver ? "ring-2 ring-inset ring-foreground" : "hover:bg-[#e9eaec]"}`}
                style={{ paddingLeft: `${depth * 20 + 12}px` }}
                onClick={() => toggleFolder(folder.id)}
            >
                {canEdit && (
                    <button
                        {...listeners}
                        className="p-1 cursor-grab active:cursor-grabbing touch-none shrink-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                    </button>
                )}
                <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground/50 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                {isExpanded
                    ? <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    : <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                }
                <span className="flex-1 text-sm font-medium text-foreground">{folder.name}</span>

                {folder.effectiveWptName && (() => {
                    const colorDef = folder.effectiveWptColor
                        ? LOT_COLOR_MAP[folder.effectiveWptColor as LotColorKey]
                        : undefined;
                    const color = colorDef?.hex ?? "#6b7280";
                    return (
                        <span
                            className="flex items-center gap-1 text-xs shrink-0 max-w-[140px] truncate font-medium"
                            style={{ color }}
                        >
                            <Tag className="h-3 w-3 shrink-0" fill="currentColor" stroke="none" />
                            <span className="truncate">{folder.effectiveWptName}</span>
                        </span>
                    );
                })()}

                {canEdit && (
                    <div
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={() => openCreateItem(folder.id)} className="p-1.5 rounded hover:bg-hover transition-colors" title="Ajouter un ouvrage">
                            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded hover:bg-hover transition-colors">
                                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => openCreateSubfolder(folder.id)}>
                                    <Folder className="h-3.5 w-3.5 mr-2" />
                                    Nouveau sous-dossier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openRenameFolder(folder.id, folder.name)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" />
                                    Renommer
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openSetWpt(folder.id, folder.name, folder.workPackageTemplateId)}>
                                    <Tag className="h-3.5 w-3.5 mr-2" />
                                    {folder.workPackageTemplateId ? "Changer le lot" : "Assigner un lot"}
                                </DropdownMenuItem>
                                {folder.workPackageTemplateId && (
                                    <DropdownMenuItem onClick={() => handleRemoveWpt(folder.id)}>
                                        <X className="h-3.5 w-3.5 mr-2" />
                                        Retirer le lot
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDeleteFolder(folder.id)}
                                    disabled={hasChildren}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    {hasChildren ? "Dossier non vide" : "Supprimer"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            {/* Contenu du dossier */}
            {isExpanded && (
                <div>
                    <SortableContext items={childFolders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                        {childFolders.map((child) => (
                            <FolderNode key={child.id} folder={child} depth={depth + 1} />
                        ))}
                    </SortableContext>
                    <SortableContext items={childItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                        {childItems.map((item) => (
                            <SortableItemRow key={item.id} item={item} depth={depth + 1} />
                        ))}
                    </SortableContext>
                    {!hasChildren && (
                        <div className="py-3 caption text-center text-muted-foreground/50 border-b border-border/40" style={{ paddingLeft: `${(depth + 1) * 20 + 32}px` }}>
                            Dossier vide
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Composant principal ──────────────────────────────────

export default function WorkItemsClient({ orgSlug, tree, callerRole, workPackageTemplates }: Props) {
    const router = useRouter();
    const canEdit = callerRole === "FOUNDER" || callerRole === "MANAGER";
    const dndId = useId();

    const [itemsMap, setItemsMap] = useState<ItemsMap>(() => buildItemsMap(tree));
    const [foldersMap, setFoldersMap] = useState<FoldersMap>(() => buildFoldersMap(tree));

    // Resync après router.refresh() (les props tree changent mais useState ne se réinitialise pas)
    useEffect(() => {
        setItemsMap(buildItemsMap(tree));
        setFoldersMap(buildFoldersMap(tree));
    }, [tree]);
    const [activeItemId, setActiveItemId] = useState<UniqueIdentifier | null>(null);
    const [activeDragType, setActiveDragType] = useState<"item" | "folder" | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());

    const [sheet, setSheet] = useState<SheetState | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [itemForm, setItemForm] = useState<WorkItemTemplateFormData>(EMPTY_ITEM_FORM);
    const [folderNameInput, setFolderNameInput] = useState("");
    const [selectedWptId, setSelectedWptId] = useState<string>("");

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const rootFolders = foldersMap.get(null) ?? [];
    const rootItems = itemsMap.get(null) ?? [];
    const flatFolders = flattenFolders(rootFolders);
    const totalItems = (() => { let n = 0; itemsMap.forEach((v) => { n += v.length; }); return n; })();

    // ─── DnD ──────────────────────────────────────────────

    function onDragStart(event: DragStartEvent) {
        setActiveItemId(event.active.id);
        setActiveDragType(event.active.data.current?.type ?? null);
    }

    function onDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveItemId(null);
        setActiveDragType(null);
        if (!over || active.id === over.id) return;

        const activeType = active.data.current?.type as "item" | "folder";
        const overType = over.data.current?.type as "item" | "folder";

        if (activeType === "item") {
            const activeFolderId = (active.data.current?.folderId as string | null) ?? null;

            if (overType === "folder") {
                // Déposer sur un dossier → ajouter en fin
                const targetFolderId = over.id as string;
                if (activeFolderId === targetFolderId) return;
                const sourceItems = itemsMap.get(activeFolderId) ?? [];
                const targetItems = itemsMap.get(targetFolderId) ?? [];
                const movedItem = sourceItems.find((i) => i.id === active.id);
                if (!movedItem) return;
                const newSource = sourceItems.filter((i) => i.id !== active.id);
                const newTarget = [...targetItems, { ...movedItem, folderId: targetFolderId }];
                setItemsMap((prev) => { const n = new Map(prev); n.set(activeFolderId, newSource); n.set(targetFolderId, newTarget); return n; });
                setExpandedFolders((prev) => new Set([...prev, targetFolderId]));
                const updates = [...newSource.map((item, idx) => ({ id: item.id, folderId: activeFolderId, position: idx })), ...newTarget.map((item, idx) => ({ id: item.id, folderId: targetFolderId, position: idx }))];
                reorderItems(orgSlug, updates).then(() => router.refresh());

            } else if (overType === "item") {
                const overFolderId = (over.data.current?.folderId as string | null) ?? null;
                if (activeFolderId === overFolderId) {
                    // Même dossier → réordonner
                    const items = itemsMap.get(activeFolderId) ?? [];
                    const newItems = arrayMove(items, items.findIndex((i) => i.id === active.id), items.findIndex((i) => i.id === over.id));
                    setItemsMap((prev) => { const n = new Map(prev); n.set(activeFolderId, newItems); return n; });
                    reorderItems(orgSlug, newItems.map((item, idx) => ({ id: item.id, folderId: activeFolderId, position: idx }))).then(() => router.refresh());
                } else {
                    // Dossier différent → déplacer et insérer
                    const sourceItems = itemsMap.get(activeFolderId) ?? [];
                    const targetItems = itemsMap.get(overFolderId) ?? [];
                    const movedItem = sourceItems.find((i) => i.id === active.id);
                    if (!movedItem) return;
                    const newSource = sourceItems.filter((i) => i.id !== active.id);
                    const overIdx = targetItems.findIndex((i) => i.id === over.id);
                    const newTarget = [...targetItems.slice(0, overIdx), { ...movedItem, folderId: overFolderId }, ...targetItems.slice(overIdx)];
                    setItemsMap((prev) => { const n = new Map(prev); n.set(activeFolderId, newSource); n.set(overFolderId, newTarget); return n; });
                    const updates = [...newSource.map((item, idx) => ({ id: item.id, folderId: activeFolderId, position: idx })), ...newTarget.map((item, idx) => ({ id: item.id, folderId: overFolderId, position: idx }))];
                    reorderItems(orgSlug, updates).then(() => router.refresh());
                }
            }

        } else if (activeType === "folder" && overType === "folder") {
            const activeParentId = (active.data.current?.parentId as string | null) ?? null;
            const overParentId = (over.data.current?.parentId as string | null) ?? null;
            if (activeParentId !== overParentId) return;
            const siblings = foldersMap.get(activeParentId) ?? [];
            const newSiblings = arrayMove(siblings, siblings.findIndex((f) => f.id === active.id), siblings.findIndex((f) => f.id === over.id));
            setFoldersMap((prev) => { const n = new Map(prev); n.set(activeParentId, newSiblings); return n; });
            reorderFolders(orgSlug, newSiblings.map((f, idx) => ({ id: f.id, position: idx }))).then(() => router.refresh());
        }
    }

    // ─── Callbacks UI ─────────────────────────────────────

    const toggleFolder = useCallback((id: string) => {
        setExpandedFolders((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    }, []);

    const openCreateItem = useCallback((folderId: string | null) => {
        setItemForm(EMPTY_ITEM_FORM);
        setError(null);
        setSheet({ type: "item-create", folderId });
    }, []);

    const openEditItem = useCallback((item: WorkItemTemplateItem) => {
        setItemForm({ name: item.name, description: item.description ?? "", unit: item.unit, defaultUnitPrice: item.defaultUnitPrice ?? "", estimatedUnitCost: item.estimatedUnitCost ?? "", defaultTaxRate: item.defaultTaxRate ?? "" });
        setError(null);
        setSheet({ type: "item-edit", item });
    }, []);

    const handleDeleteItem = useCallback(async (id: string) => {
        await deleteWorkItemTemplate(orgSlug, id);
        setItemsMap((prev) => { const n = new Map(prev); n.forEach((items, key) => n.set(key, items.filter((i) => i.id !== id))); return n; });
        router.refresh();
    }, [orgSlug, router]);

    const openCreateSubfolder = useCallback((parentId: string) => {
        setFolderNameInput(""); setError(null);
        setSheet({ type: "folder-create", parentId });
    }, []);

    const openRenameFolder = useCallback((folderId: string, currentName: string) => {
        setFolderNameInput(currentName); setError(null);
        setSheet({ type: "folder-rename", folderId, currentName });
    }, []);

    const openSetWpt = useCallback((folderId: string, folderName: string, currentWptId: string | null) => {
        setSelectedWptId(currentWptId ?? "none"); setError(null);
        setSheet({ type: "folder-wpt", folderId, folderName, currentWptId });
    }, []);

    const handleRemoveWpt = useCallback(async (folderId: string) => {
        await setFolderWpt(orgSlug, folderId, null);
        router.refresh();
    }, [orgSlug, router]);

    const handleDeleteFolder = useCallback(async (folderId: string) => {
        const res = await deleteFolder(orgSlug, folderId);
        if (res.error) { setError(res.error); return; }
        router.refresh();
    }, [orgSlug, router]);

    // ─── Save handlers ────────────────────────────────────

    async function handleSaveItem() {
        if (!sheet || (sheet.type !== "item-create" && sheet.type !== "item-edit")) return;
        setSaving(true); setError(null);
        try {
            const res = sheet.type === "item-create"
                ? await createWorkItemTemplate(orgSlug, itemForm, sheet.folderId)
                : await updateWorkItemTemplate(orgSlug, sheet.item.id, itemForm);
            if (res.error) { setError(res.error); return; }
            setSheet(null); router.refresh();
        } finally { setSaving(false); }
    }

    async function handleSaveFolder() {
        if (!sheet || (sheet.type !== "folder-create" && sheet.type !== "folder-rename")) return;
        setSaving(true); setError(null);
        try {
            const res = sheet.type === "folder-create"
                ? await createFolder(orgSlug, { name: folderNameInput, parentId: sheet.parentId })
                : await renameFolder(orgSlug, sheet.folderId, folderNameInput);
            if (res.error) { setError(res.error); return; }
            setSheet(null); router.refresh();
        } finally { setSaving(false); }
    }

    async function handleSaveWpt() {
        if (!sheet || sheet.type !== "folder-wpt") return;
        setSaving(true); setError(null);
        try {
            const res = await setFolderWpt(orgSlug, sheet.folderId, selectedWptId === "none" ? null : selectedWptId);
            if (res.error) { setError(res.error); return; }
            setSheet(null); router.refresh();
        } finally { setSaving(false); }
    }

    // ─── Active drag overlay item ──────────────────────────

    const activeDragItem = (() => {
        if (!activeItemId || activeDragType !== "item") return null;
        for (const items of itemsMap.values()) {
            const found = items.find((i) => i.id === activeItemId);
            if (found) return found;
        }
        return null;
    })();

    const isEmpty = rootFolders.length === 0 && rootItems.length === 0;

    // ─── Context value ────────────────────────────────────

    const ctxValue: LibraryCtx = {
        orgSlug, canEdit, itemsMap, foldersMap, expandedFolders, activeDragType,
        toggleFolder, openCreateItem, openEditItem, handleDeleteItem,
        openCreateSubfolder, openRenameFolder, openSetWpt, handleRemoveWpt, handleDeleteFolder,
    };

    return (
        <LibraryContext.Provider value={ctxValue}>
            <main className="py-8 max-w-5xl">
                {/* En-tête */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="section-title">Ouvrages</h2>
                        <p className="caption mt-1">Unités de travail élémentaires avec leurs prix et rendements de référence.</p>
                    </div>
                    {canEdit && (
                        <div className="flex items-center gap-2 shrink-0 ml-6 mt-0.5">
                            <Button size="sm" variant="outline" onClick={() => { setFolderNameInput(""); setError(null); setSheet({ type: "folder-create", parentId: null }); }}>
                                <Folder className="h-3.5 w-3.5" />
                                Nouveau dossier
                            </Button>
                            <Button size="sm" onClick={() => openCreateItem(null)}>
                                <Plus className="h-3.5 w-3.5" />
                                Nouvel ouvrage
                            </Button>
                        </div>
                    )}
                </div>

                {/* Contenu */}
                {isEmpty ? (
                    <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                            <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="body-sm font-medium">Bibliothèque vide</p>
                        <p className="mt-1 caption max-w-xs">Créez des dossiers pour organiser vos ouvrages, ou ajoutez directement un ouvrage.</p>
                        {canEdit && (
                            <div className="flex items-center gap-2 mt-6">
                                <Button size="sm" variant="outline" onClick={() => { setFolderNameInput(""); setError(null); setSheet({ type: "folder-create", parentId: null }); }}>
                                    <Folder className="h-3.5 w-3.5" />
                                    Nouveau dossier
                                </Button>
                                <Button size="sm" onClick={() => openCreateItem(null)}>
                                    <Plus className="h-3.5 w-3.5" />
                                    Nouvel ouvrage
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <p className="caption mb-3">
                            {totalItems} ouvrage{totalItems > 1 ? "s" : ""}
                            {rootFolders.length > 0 && ` · ${flatFolders.length} dossier${flatFolders.length > 1 ? "s" : ""}`}
                        </p>
                        <DndContext id={dndId} sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                            <div className="rounded-lg border border-border overflow-hidden">
                                <SortableContext items={rootFolders.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                                    {rootFolders.map((f) => <FolderNode key={f.id} folder={f} depth={0} />)}
                                </SortableContext>
                                <SortableContext items={rootItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                                    {rootItems.map((item) => <SortableItemRow key={item.id} item={item} depth={0} />)}
                                </SortableContext>
                            </div>
                            <DragOverlay>
                                {activeDragItem && (
                                    <SortableItemRow item={activeDragItem} depth={0} isOverlay />
                                )}
                            </DragOverlay>
                        </DndContext>
                    </div>
                )}

                {/* Sheet */}
                <Sheet open={sheet !== null} onOpenChange={(o) => { if (!o && !saving) setSheet(null); }}>
                    <SheetContent>
                        {(sheet?.type === "item-create" || sheet?.type === "item-edit") && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>{sheet.type === "item-create" ? "Nouvel ouvrage" : "Modifier l'ouvrage"}</SheetTitle>
                                    <SheetDescription>{sheet.type === "item-create" ? "Créez un ouvrage de référence." : "Modifiez les informations de cet ouvrage."}</SheetDescription>
                                </SheetHeader>
                                <div className="mt-8 space-y-5 px-1">
                                    <div className="space-y-2">
                                        <Label>Nom <span className="text-destructive">*</span></Label>
                                        <Input value={itemForm.name} onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex : Pose de carrelage au sol" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <textarea value={itemForm.description} onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))} placeholder="Spécifications techniques…" rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unité <span className="text-destructive">*</span></Label>
                                        <Select value={itemForm.unit} onValueChange={(v) => setItemForm((f) => ({ ...f, unit: v }))}>
                                            <SelectTrigger><SelectValue placeholder="Choisir une unité" /></SelectTrigger>
                                            <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Prix HT / Unité</Label>
                                            <Input type="number" min="0" step="0.01" value={itemForm.defaultUnitPrice} onChange={(e) => setItemForm((f) => ({ ...f, defaultUnitPrice: e.target.value }))} placeholder="0,00" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Coût est. / Unité</Label>
                                            <Input type="number" min="0" step="0.01" value={itemForm.estimatedUnitCost} onChange={(e) => setItemForm((f) => ({ ...f, estimatedUnitCost: e.target.value }))} placeholder="0,00" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Taux de TVA</Label>
                                        <Select value={itemForm.defaultTaxRate} onValueChange={(v) => setItemForm((f) => ({ ...f, defaultTaxRate: v }))}>
                                            <SelectTrigger><SelectValue placeholder="Choisir un taux" /></SelectTrigger>
                                            <SelectContent>{TAX_RATES.map((r) => <SelectItem key={r} value={r}>{r} %</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    {error && <p className="text-error text-sm">{error}</p>}
                                    <Button onClick={handleSaveItem} disabled={saving} className="w-full">
                                        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</> : sheet.type === "item-create" ? "Créer l'ouvrage" : "Enregistrer"}
                                    </Button>
                                </div>
                            </>
                        )}
                        {(sheet?.type === "folder-create" || sheet?.type === "folder-rename") && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>{sheet.type === "folder-create" ? "Nouveau dossier" : "Renommer le dossier"}</SheetTitle>
                                </SheetHeader>
                                <div className="mt-8 space-y-5 px-1">
                                    <div className="space-y-2">
                                        <Label>Nom <span className="text-destructive">*</span></Label>
                                        <Input value={folderNameInput} onChange={(e) => setFolderNameInput(e.target.value)} placeholder="Ex : Gros œuvre" autoFocus />
                                    </div>
                                    {error && <p className="text-error text-sm">{error}</p>}
                                    <Button onClick={handleSaveFolder} disabled={saving} className="w-full">
                                        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</> : sheet.type === "folder-create" ? "Créer" : "Renommer"}
                                    </Button>
                                </div>
                            </>
                        )}
                        {sheet?.type === "folder-wpt" && (
                            <>
                                <SheetHeader>
                                    <SheetTitle>Lot du dossier</SheetTitle>
                                    <SheetDescription>Tous les ouvrages dans «&nbsp;{sheet.folderName}&nbsp;» et ses sous-dossiers hériteront de ce lot.</SheetDescription>
                                </SheetHeader>
                                <div className="mt-8 space-y-5 px-1">
                                    <div className="space-y-2">
                                        <Label>Lot associé</Label>
                                        <Select value={selectedWptId} onValueChange={setSelectedWptId}>
                                            <SelectTrigger><SelectValue placeholder="Choisir un lot" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Aucun lot</SelectItem>
                                                {workPackageTemplates.map((wpt) => <SelectItem key={wpt.id} value={wpt.id}>{wpt.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {error && <p className="text-error text-sm">{error}</p>}
                                    <Button onClick={handleSaveWpt} disabled={saving} className="w-full">
                                        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</> : "Enregistrer"}
                                    </Button>
                                </div>
                            </>
                        )}
                    </SheetContent>
                </Sheet>
            </main>
        </LibraryContext.Provider>
    );
}
