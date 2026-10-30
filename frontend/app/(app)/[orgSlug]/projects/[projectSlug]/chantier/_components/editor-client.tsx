"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Package, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectEditorData, ProjectSpaceItem, WorkItemItem, WorkPackageItem } from "@/lib/actions/project-editor";
import { computeWorkItemFinancials, workItemToInput, formatPrice, formatPercent } from "@/lib/pricing";
import { EditorProvider, type PriceMode } from "./editor-context";
import SpaceView from "./space-view";
import PackageView from "./package-view";

type View = "space" | "lot";

type Props = {
    orgSlug: string;
    projectSlug: string;
    data: ProjectEditorData;
};

export default function LeadEditorClient({ orgSlug, projectSlug, data }: Props) {
    const router = useRouter();
    const [view, setView] = useState<View>("space");
    const [priceMode, setPriceMode] = useState<PriceMode>("ht");
    const [spaces, setSpaces] = useState<ProjectSpaceItem[]>(() => data.spaces);
    const [workPackages, setWorkPackages] = useState<WorkPackageItem[]>(() => data.workPackages);

    useEffect(() => {
        setSpaces(data.spaces);
        setWorkPackages(data.workPackages);
    }, [data]);

    const projectTotals = useMemo(() => {
        const defaultMarginRate = data.project.defaultMarginRate
            ? parseFloat(data.project.defaultMarginRate)
            : null;

        const seen = new Set<string>();
        const allItems: WorkItemItem[] = [];

        function addFromSpace(s: ProjectSpaceItem) {
            for (const item of s.workItems) {
                if (!seen.has(item.id)) { seen.add(item.id); allItems.push(item); }
            }
            for (const child of s.children) addFromSpace(child);
        }
        for (const s of spaces) addFromSpace(s);
        for (const p of workPackages) {
            for (const item of p.workItems) {
                if (!seen.has(item.id)) { seen.add(item.id); allItems.push(item); }
            }
        }

        let totalAfficheHt = 0, totalCostHt = 0, totalTtc = 0;
        for (const item of allItems) {
            const wp = workPackages.find((p) => p.id === item.workPackageId);
            const lotRate = wp?.marginRate ? parseFloat(wp.marginRate) : null;
            const r = computeWorkItemFinancials(workItemToInput(item), lotRate, defaultMarginRate);
            totalAfficheHt += r.totalAfficheHt;
            totalCostHt += r.totalCostHt;
            totalTtc += r.totalTtc;
        }

        const effectiveMarkup = totalCostHt > 0 ? (totalAfficheHt - totalCostHt) / totalCostHt : 0;

        function countSpaces(ss: ProjectSpaceItem[]): number {
            return ss.reduce((n, s) => n + 1 + countSpaces(s.children), 0);
        }

        return {
            totalAfficheHt,
            totalCostHt,
            totalTtc,
            effectiveMarkup,
            nbSpaces: countSpaces(spaces),
            nbLots: workPackages.length,
            nbOuvrages: allItems.length,
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [spaces, workPackages, data.project.defaultMarginRate]);

    function onRefresh() {
        router.refresh();
    }

    return (
        <EditorProvider
            orgSlug={orgSlug}
            projectSlug={projectSlug}
            data={{ ...data, workPackages }}
            priceMode={priceMode}
            onRefresh={onRefresh}
        >
            <main className="page-outer pt-8 pb-10">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="page-title">Chantier</h1>
                    <p className="mt-1 caption">Chantier de {data.project.name}</p>
                </div>

                {/* 2-column layout */}
                <div className="flex gap-10 items-start">
                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0">
                        {view === "space" ? (
                            <SpaceView spaces={spaces} setSpaces={setSpaces} />
                        ) : (
                            <PackageView workPackages={workPackages} setWorkPackages={setWorkPackages} />
                        )}
                    </div>

                    {/* Aside */}
                    <aside className="w-56 flex-shrink-0 sticky top-6 self-start space-y-6">
                        {/* Récapitulatif projet */}
                        <div>
                            <p className="caption font-medium mb-3">Récapitulatif</p>
                            {projectTotals.totalAfficheHt > 0 ? (
                                <div className="space-y-2.5">
                                    {/* Montant principal — suit le toggle HT/TTC */}
                                    <p className="text-xl font-bold text-foreground tabular-nums leading-tight">
                                        {formatPrice(priceMode === "ht" ? projectTotals.totalAfficheHt : projectTotals.totalTtc)}
                                        <sup className="text-[0.55em] font-semibold ml-px tracking-wide">
                                            {priceMode.toUpperCase()}
                                        </sup>
                                    </p>
                                    {/* Marge */}
                                    {(projectTotals.totalAfficheHt - projectTotals.totalCostHt) > 0 && (
                                        <div>
                                            <p className="text-sm font-medium tabular-nums text-foreground">
                                                Marge {formatPrice(projectTotals.totalAfficheHt - projectTotals.totalCostHt)}
                                                <sup className="text-[0.55em] font-semibold ml-px">HT</sup>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                soit {formatPercent(projectTotals.effectiveMarkup)} de marge
                                            </p>
                                        </div>
                                    )}
                                    {/* Compteurs */}
                                    <div className="pt-2 border-t border-border flex items-center gap-3">
                                        <span className="flex items-center gap-1 caption">
                                            <Wrench className="h-3 w-3" />
                                            {projectTotals.nbOuvrages}
                                        </span>
                                        <span className="flex items-center gap-1 caption">
                                            <Package className="h-3 w-3" />
                                            {projectTotals.nbLots}
                                        </span>
                                        <span className="flex items-center gap-1 caption">
                                            <Layers className="h-3 w-3" />
                                            {projectTotals.nbSpaces}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="caption">Aucun ouvrage renseigné.</p>
                            )}
                        </div>

                        {/* Prix affichés HT / TTC */}
                        <div>
                            <p className="caption font-medium mb-2">Prix affichés</p>
                            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-subtle">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPriceMode("ht")}
                                    className={
                                        priceMode === "ht"
                                            ? "flex-1 bg-background shadow-sm text-foreground h-7 px-3"
                                            : "flex-1 text-muted-foreground h-7 px-3 hover:bg-background/60"
                                    }
                                >
                                    HT
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPriceMode("ttc")}
                                    className={
                                        priceMode === "ttc"
                                            ? "flex-1 bg-background shadow-sm text-foreground h-7 px-3"
                                            : "flex-1 text-muted-foreground h-7 px-3 hover:bg-background/60"
                                    }
                                >
                                    TTC
                                </Button>
                            </div>
                        </div>

                        {/* Présentation */}
                        <div>
                            <p className="caption font-medium mb-2">Présentation</p>
                            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-subtle">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setView("space")}
                                    className={
                                        view === "space"
                                            ? "flex-1 bg-background shadow-sm text-foreground h-7 px-3"
                                            : "flex-1 text-muted-foreground h-7 px-3 hover:bg-background/60"
                                    }
                                >
                                    <Layers className="h-3.5 w-3.5" />
                                    Par espace
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setView("lot")}
                                    className={
                                        view === "lot"
                                            ? "flex-1 bg-background shadow-sm text-foreground h-7 px-3"
                                            : "flex-1 text-muted-foreground h-7 px-3 hover:bg-background/60"
                                    }
                                >
                                    <Package className="h-3.5 w-3.5" />
                                    Par lot
                                </Button>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </EditorProvider>
    );
}
