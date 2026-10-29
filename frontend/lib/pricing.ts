// ─── Pricing utilities ────────────────────────────────────────────────────────
// Marge = markup sur coût (100 € coût × 1.30 = 130 € vendu, marge 30 %)

export type WorkItemPricingInput = {
    puEstimeHt: number | null;
    quantity: number;
    puSubcontractorHt: number | null;
    quantitySubcontractor: number | null;
    /** null = hérite du lot ou du projet */
    marginRate: number | null;
    tauxTva: number;
};

export type PricingResult = {
    totalEstimeHt: number;
    totalSubcontractorHt: number;
    totalCostHt: number;
    effectiveMarginRate: number;
    totalAfficheHt: number;
    margeEuros: number;
    totalTtc: number;
};

/**
 * Calcule les montants financiers d'un ouvrage.
 * Hiérarchie de marge : item.marginRate > lotMarginRate > projectMarginRate > 0
 */
export function computeWorkItemFinancials(
    item: WorkItemPricingInput,
    lotMarginRate: number | null,
    projectMarginRate: number | null,
): PricingResult {
    const totalEstimeHt = item.puEstimeHt != null ? item.puEstimeHt * item.quantity : 0;
    const totalSubcontractorHt =
        item.puSubcontractorHt != null && item.quantitySubcontractor != null
            ? item.puSubcontractorHt * item.quantitySubcontractor
            : 0;
    const totalCostHt = Math.max(totalEstimeHt, totalSubcontractorHt);
    const effectiveMarginRate = item.marginRate ?? lotMarginRate ?? projectMarginRate ?? 0;
    const totalAfficheHt = totalCostHt * (1 + effectiveMarginRate);
    const margeEuros = totalAfficheHt - totalCostHt;
    const totalTtc = totalAfficheHt * (1 + item.tauxTva);

    return {
        totalEstimeHt,
        totalSubcontractorHt,
        totalCostHt,
        effectiveMarginRate,
        totalAfficheHt,
        margeEuros,
        totalTtc,
    };
}

/** Convertit un WorkItemItem (champs string) en input de calcul */
export function workItemToInput(item: {
    puEstimeHt: string | null;
    quantity: string;
    puSubcontractorHt: string | null;
    quantitySubcontractor: string | null;
    marginRate: string | null;
    tauxTva: string;
}): WorkItemPricingInput {
    return {
        puEstimeHt: item.puEstimeHt ? parseFloat(item.puEstimeHt) : null,
        quantity: parseFloat(item.quantity) || 0,
        puSubcontractorHt: item.puSubcontractorHt ? parseFloat(item.puSubcontractorHt) : null,
        quantitySubcontractor: item.quantitySubcontractor ? parseFloat(item.quantitySubcontractor) : null,
        marginRate: item.marginRate ? parseFloat(item.marginRate) : null,
        tauxTva: parseFloat(item.tauxTva) || 0.10,
    };
}

/** Somme les totaux financiers d'une liste d'ouvrages */
export function computeLotTotals(
    items: Parameters<typeof workItemToInput>[0][],
    lotMarginRate: number | null,
    projectMarginRate: number | null,
) {
    let totalCostHt = 0;
    let totalAfficheHt = 0;
    let margeEuros = 0;
    let totalTtc = 0;
    for (const item of items) {
        const r = computeWorkItemFinancials(workItemToInput(item), lotMarginRate, projectMarginRate);
        totalCostHt += r.totalCostHt;
        totalAfficheHt += r.totalAfficheHt;
        margeEuros += r.margeEuros;
        totalTtc += r.totalTtc;
    }
    return { totalCostHt, totalAfficheHt, margeEuros, totalTtc };
}

// ─── Formatage ────────────────────────────────────────────────────────────────

/** Formate un montant en euros (ex : 1 200 €) */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/** Formate un taux en pourcentage (ex : 30 %) */
export function formatPercent(rate: number): string {
    return `${(rate * 100).toFixed(0)} %`;
}

/** Normalise une valeur TVA Postgres (ex: "0.1") vers l'une des valeurs du select */
export function normalizeTva(raw: string | null): "0.055" | "0.10" | "0.20" {
    const v = parseFloat(raw ?? "0.1");
    if (Math.abs(v - 0.055) < 0.001) return "0.055";
    if (Math.abs(v - 0.2) < 0.001) return "0.20";
    return "0.10";
}

export const TVA_OPTIONS = [
    { label: "5,5 %", value: "0.055" },
    { label: "10 %", value: "0.10" },
    { label: "20 %", value: "0.20" },
] as const;
