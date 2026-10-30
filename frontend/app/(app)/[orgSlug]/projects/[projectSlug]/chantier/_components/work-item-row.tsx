"use client";

import { useMemo, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import {
    computeWorkItemFinancials,
    workItemToInput,
    formatPrice,
    formatQty,
    formatPercent,
    type PricingResult,
} from "@/lib/pricing";
import { useEditor, type PriceMode } from "./editor-context";
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


type PuDetail = {
    pu: number;
    qty: number;
    unit: string;
    source: "est" | "sub";
};

/**
 * Bloc financier d'un ouvrage.
 * Futur : remplacer ou alterner avec un bloc progression/tâches.
 */
function WorkItemPriceBlock({
    financials,
    puDetail,
    priceMode,
}: {
    financials: PricingResult;
    puDetail: PuDetail | null;
    priceMode: PriceMode;
}) {
    if (financials.totalAfficheHt === 0) return null;
    const displayPrice = priceMode === "ttc" ? financials.totalTtc : financials.totalAfficheHt;
    return (
        <div className="shrink-0 px-3 py-2.5 flex flex-col items-end justify-center min-w-[172px] gap-0.5">
            {/* Prix principal */}
            <span className="text-base font-bold text-foreground tabular-nums leading-tight">
                {formatPrice(displayPrice)}
                <sup className="text-[0.6em] font-semibold ml-0.5 tracking-wide">
                    {priceMode === "ttc" ? "TTC" : "HT"}
                </sup>
            </span>

            {/* Source du coût + résultat */}
            {puDetail && (
                <span className="mt-1 text-xs text-muted-foreground tabular-nums text-right leading-snug">
                    Coût {formatPrice(puDetail.pu)} × {formatQty(puDetail.qty)} {puDetail.unit}
                    {" = "}
                    {formatPrice(financials.totalCostHt)}
                    <sup className="text-[0.6em] font-semibold ml-0.5">HT</sup>
                </span>
            )}

            {/* Marge — montant + % */}
            {financials.effectiveMarginRate > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                    marge{" "}
                    {financials.margeEuros > 0 && (
                        <>
                            {formatPrice(financials.margeEuros)}
                            <sup className="text-[0.6em] font-semibold ml-0.5">HT</sup>
                            {" "}
                        </>
                    )}
                    ({formatPercent(financials.effectiveMarginRate)})
                </span>
            )}
        </div>
    );
}

type Props = {
    item: WorkItemItem;
    spaceId: string | null;
};

export default function WorkItemRow({ item, spaceId }: Props) {
    const { orgSlug, projectSlug, workPackages, projectDefaultMarginRate, priceMode, onRefresh } =
        useEditor();
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

    const lotColor = item.workPackageColor
        ? LOT_COLOR_MAP[item.workPackageColor as LotColorKey]
        : null;

    const lotPkg = workPackages.find((p) => p.id === item.workPackageId);
    const lotRate = lotPkg?.marginRate ? parseFloat(lotPkg.marginRate) : null;

    const input = useMemo(() => workItemToInput(item), [item]);

    const financials = useMemo(
        () => computeWorkItemFinancials(input, lotRate, projectDefaultMarginRate),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [input, lotRate, projectDefaultMarginRate],
    );

    // Source du coût retenue (ST prime sur estimation si montant supérieur)
    const puDetail = useMemo((): PuDetail | null => {
        const estTotal = input.puEstimeHt != null ? input.puEstimeHt * input.quantity : 0;
        const subTotal =
            input.puSubcontractorHt != null && input.quantitySubcontractor != null
                ? input.puSubcontractorHt * input.quantitySubcontractor
                : 0;
        if (estTotal === 0 && subTotal === 0) return null;
        if (subTotal > estTotal && input.puSubcontractorHt != null && input.quantitySubcontractor != null) {
            return { pu: input.puSubcontractorHt, qty: input.quantitySubcontractor, unit: item.unit, source: "sub" };
        }
        if (input.puEstimeHt != null) {
            return { pu: input.puEstimeHt, qty: input.quantity, unit: item.unit, source: "est" };
        }
        return null;
    }, [input, item.unit]);

    const hasPrice = financials.totalAfficheHt > 0;

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

    return (
        <>
            <div
                ref={setNodeRef}
                style={{
                    ...style,
                    borderLeftColor: lotColor?.hex ?? "#6b7280",
                    borderLeftWidth: 5,
                }}
                {...attributes}
                className={`group mb-1.5 rounded-r-lg border border-border bg-background hover:border-border-strong transition-all overflow-hidden ${deleting ? "opacity-50 pointer-events-none" : ""}`}
            >
                <div className="flex items-stretch">
                    {/* Poignée */}
                    <div className="flex items-start pt-2.5 pl-2 pr-0.5">
                        <button
                            {...listeners}
                            className="opacity-20 group-hover:opacity-60 hover:!opacity-100 cursor-grab active:cursor-grabbing p-0.5 rounded text-muted-foreground transition-opacity"
                            tabIndex={-1}
                        >
                            <GripVertical className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0 py-2.5 pr-2">
                        {/* Ligne 1 : icône + nom */}
                        <div className="flex items-center gap-2">
                            <Box className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="flex-1 body-sm font-medium truncate">{item.name}</span>
                        </div>

                        {/* Ligne 2 : lot · espace · statut */}
                        <div className="mt-1.5 ml-5 flex items-center gap-2.5 flex-wrap">
                            {item.workPackageName && (
                                <span className="text-xs text-muted-foreground">
                                    {item.workPackageName}
                                </span>
                            )}
                            {item.projectSpaceName && (
                                <span className="text-xs text-muted-foreground">
                                    {item.projectSpaceName}
                                </span>
                            )}

                            {/* Statut — texte gris cliquable */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="text-xs text-muted-foreground hover:text-foreground transition-colors leading-none">
                                        {STATUS_LABELS[item.status]}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-36">
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
                        </div>

                        {/* Ligne 3 : description */}
                        {item.description && (
                            <p className="mt-1.5 ml-5 text-xs text-foreground line-clamp-2 leading-relaxed">
                                {item.description}
                            </p>
                        )}
                    </div>

                    {/* Bloc financier */}
                    {hasPrice && <WorkItemPriceBlock financials={financials} puDetail={puDetail} priceMode={priceMode} />}

                    {/* Actions — tout à droite */}
                    <div className="flex items-start pt-2 pr-2 shrink-0">
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
                </div>
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

export function WorkItemRowOverlay({ item }: { item: WorkItemItem }) {
    const lotColor = item.workPackageColor
        ? LOT_COLOR_MAP[item.workPackageColor as LotColorKey]
        : null;
    return (
        <div className="rounded-lg border border-border bg-background shadow-md overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Box className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 body-sm font-medium truncate">{item.name}</span>
                {lotColor && (
                    <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: lotColor.hex }}
                    />
                )}
                <span className="caption text-xs shrink-0 tabular-nums">
                    {formatQty(parseFloat(item.quantity))} {item.unit}
                </span>
            </div>
        </div>
    );
}
