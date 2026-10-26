"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Layers, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProjectEditorData, ProjectSpaceItem, WorkItemItem } from "@/lib/actions/project-editor";

type View = "space" | "lot";

type Props = {
    data: ProjectEditorData;
};

// ─── Status ────────────────────────────────────────────────

const STATUS_CONFIG = {
    DRAFT:       { label: "À faire",     variant: "neutral"     },
    IN_PROGRESS: { label: "En cours",    variant: "info"        },
    DONE:        { label: "Terminé",     variant: "success"     },
    CANCELLED:   { label: "Annulé",      variant: "destructive" },
} as const;

function StatusBadge({ status }: { status: WorkItemItem["status"] }) {
    const cfg = STATUS_CONFIG[status];
    return <Badge variant={cfg.variant as "neutral" | "info" | "success" | "destructive"}>{cfg.label}</Badge>;
}

// ─── Lot color dot ─────────────────────────────────────────

const LOT_COLOR_MAP: Record<string, string> = {
    NAVY: "#1e3a5f", BLUE: "#2563eb", SKY: "#0ea5e9", CYAN: "#06b6d4",
    INDIGO: "#4f46e5", VIOLET: "#7c3aed", PURPLE: "#9333ea", FUCHSIA: "#d946ef",
    PINK: "#ec4899", ROSE: "#f43f5e", RED: "#dc2626", ORANGE: "#ea580c",
    AMBER: "#d97706", YELLOW: "#ca8a04", SLATE: "#475569", ZINC: "#71717a",
    STONE: "#78716c",
};

function LotDot({ color }: { color: string | null }) {
    if (!color) return null;
    return (
        <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ background: LOT_COLOR_MAP[color] ?? "#d1d5db" }}
        />
    );
}

// ─── Vue espace (read-only) ────────────────────────────────

function SpaceRow({ space, depth = 0 }: { space: ProjectSpaceItem; depth?: number }) {
    const [open, setOpen] = useState(true);
    const hasContent = space.children.length > 0 || space.workItems.length > 0;

    return (
        <div>
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-subtle transition-colors"
                style={{ paddingLeft: `${12 + depth * 16}px` }}
                disabled={!hasContent}
            >
                {hasContent ? (
                    open
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                    <span className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="text-sm font-medium">{space.name}</span>
                {space.workItems.length > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                        ({space.workItems.filter((i) => i.status === "DONE").length}/{space.workItems.length})
                    </span>
                )}
            </button>

            {open && hasContent && (
                <div>
                    {space.workItems.map((item) => (
                        <WorkItemRow key={item.id} item={item} depth={depth + 1} />
                    ))}
                    {space.children.map((child) => (
                        <SpaceRow key={child.id} space={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

function WorkItemRow({ item, depth = 0 }: { item: WorkItemItem; depth?: number }) {
    return (
        <div
            className="flex items-center gap-3 px-3 py-2 hover:bg-subtle/50 transition-colors"
            style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
            <LotDot color={item.workPackageColor} />
            <span className="flex-1 text-sm text-foreground truncate">{item.name}</span>
            <span className="caption shrink-0">{item.quantity} {item.unit}</span>
            <StatusBadge status={item.status} />
        </div>
    );
}

// ─── Vue lot (read-only) ───────────────────────────────────

function LotSection({ wp }: { wp: { id: string; name: string; color: string | null; workItems: WorkItemItem[] } }) {
    const [open, setOpen] = useState(true);
    const done = wp.workItems.filter((i) => i.status === "DONE").length;
    const total = wp.workItems.length;

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-3 px-4 py-3 bg-subtle/50 hover:bg-subtle transition-colors"
            >
                <LotDot color={wp.color} />
                <span className="flex-1 text-sm font-medium text-left">{wp.name}</span>
                {total > 0 && (
                    <span className="caption">{done}/{total} terminé{done > 1 ? "s" : ""}</span>
                )}
                {open
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </button>

            {open && wp.workItems.length > 0 && (
                <div className="divide-y divide-border/50">
                    {wp.workItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-subtle/30 transition-colors">
                            <span className="flex-1 text-sm text-foreground truncate">{item.name}</span>
                            <span className="caption shrink-0">{item.quantity} {item.unit}</span>
                            <StatusBadge status={item.status} />
                        </div>
                    ))}
                </div>
            )}

            {open && wp.workItems.length === 0 && (
                <p className="px-4 py-3 caption">Aucun ouvrage dans ce lot.</p>
            )}
        </div>
    );
}

// ─── Composant principal ───────────────────────────────────

export default function ClientProjectView({ data }: Props) {
    const [view, setView] = useState<View>("space");

    const totalItems = data.spaces.flatMap(function countItems(s: ProjectSpaceItem): WorkItemItem[] {
        return [...s.workItems, ...s.children.flatMap(countItems)];
    });
    const doneCount = totalItems.filter((i) => i.status === "DONE").length;
    const totalCount = totalItems.length;
    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return (
        <div className="page-outer pt-8 pb-10">
            <div className="max-w-3xl">

                {/* Progression globale */}
                {totalCount > 0 && (
                    <div className="mb-8 p-4 rounded-lg border border-border bg-subtle/30">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">Avancement global</p>
                            <p className="text-sm font-semibold">{progressPct}%</p>
                        </div>
                        <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                            <div
                                className="h-full rounded-full bg-foreground transition-all"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                        <p className="mt-1.5 caption">{doneCount} ouvrage{doneCount > 1 ? "s" : ""} terminé{doneCount > 1 ? "s" : ""} sur {totalCount}</p>
                    </div>
                )}

                {/* Toggle vue */}
                <div className="flex gap-1 mb-6">
                    <button
                        onClick={() => setView("space")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                            view === "space"
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:text-foreground hover:bg-subtle"
                        }`}
                    >
                        <Layers className="h-3.5 w-3.5" />
                        Par espace
                    </button>
                    <button
                        onClick={() => setView("lot")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                            view === "lot"
                                ? "bg-foreground text-background"
                                : "text-muted-foreground hover:text-foreground hover:bg-subtle"
                        }`}
                    >
                        <Package className="h-3.5 w-3.5" />
                        Par lot
                    </button>
                </div>

                {/* Vue espace */}
                {view === "space" && (
                    <div className="space-y-0.5">
                        {data.spaces.length === 0 ? (
                            <p className="caption">Aucun espace défini pour l&apos;instant.</p>
                        ) : (
                            data.spaces.map((space) => (
                                <SpaceRow key={space.id} space={space} />
                            ))
                        )}
                    </div>
                )}

                {/* Vue lot */}
                {view === "lot" && (
                    <div className="space-y-3">
                        {data.workPackages.length === 0 ? (
                            <p className="caption">Aucun lot défini pour l&apos;instant.</p>
                        ) : (
                            data.workPackages.map((wp) => (
                                <LotSection key={wp.id} wp={wp} />
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
