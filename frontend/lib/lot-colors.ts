export type LotColorKey =
    | "NAVY"
    | "BLUE"
    | "SKY"
    | "CYAN"
    | "INDIGO"
    | "VIOLET"
    | "PURPLE"
    | "FUCHSIA"
    | "PINK"
    | "ROSE"
    | "RED"
    | "ORANGE"
    | "AMBER"
    | "YELLOW"
    | "SLATE"
    | "ZINC"
    | "STONE";

export type LotColorDef = {
    key: LotColorKey;
    label: string;
    /** Couleur sombre, lisible sur fond blanc */
    hex: string;
    /** Variante pastel pour fond de badge/tag */
    pastel: string;
};

export const LOT_COLORS: LotColorDef[] = [
    { key: "NAVY",    label: "Marine",   hex: "#1d4ed8", pastel: "#dbeafe" },
    { key: "BLUE",    label: "Bleu",     hex: "#2563eb", pastel: "#bfdbfe" },
    { key: "SKY",     label: "Ciel",     hex: "#0284c7", pastel: "#e0f2fe" },
    { key: "CYAN",    label: "Cyan",     hex: "#0891b2", pastel: "#cffafe" },
    { key: "INDIGO",  label: "Indigo",   hex: "#4338ca", pastel: "#e0e7ff" },
    { key: "VIOLET",  label: "Violet",   hex: "#7c3aed", pastel: "#ede9fe" },
    { key: "PURPLE",  label: "Mauve",    hex: "#9333ea", pastel: "#f3e8ff" },
    { key: "FUCHSIA", label: "Fuchsia",  hex: "#c026d3", pastel: "#fae8ff" },
    { key: "PINK",    label: "Rose vif", hex: "#db2777", pastel: "#fce7f3" },
    { key: "ROSE",    label: "Rose",     hex: "#e11d48", pastel: "#ffe4e6" },
    { key: "RED",     label: "Rouge",    hex: "#dc2626", pastel: "#fee2e2" },
    { key: "ORANGE",  label: "Orange",   hex: "#ea580c", pastel: "#ffedd5" },
    { key: "AMBER",   label: "Ambre",    hex: "#d97706", pastel: "#fef3c7" },
    { key: "YELLOW",  label: "Jaune",    hex: "#ca8a04", pastel: "#fef9c3" },
    { key: "SLATE",   label: "Ardoise",  hex: "#475569", pastel: "#f1f5f9" },
    { key: "ZINC",    label: "Zinc",     hex: "#52525b", pastel: "#f4f4f5" },
    { key: "STONE",   label: "Pierre",   hex: "#57534e", pastel: "#f5f5f4" },
];

export const LOT_COLOR_MAP = Object.fromEntries(
    LOT_COLORS.map((c) => [c.key, c]),
) as Record<LotColorKey, LotColorDef>;
