export const DOCUMENT_CATEGORIES = {
    PLAN:      { label: "Plan" },
    ADMIN:     { label: "Administratif" },
    FINANCE:   { label: "Finance" },
    TECHNIQUE: { label: "Technique" },
    EXPERTISE: { label: "Expertise" },
    CONTRACT:  { label: "Contrat" },
    PV:        { label: "Procès-verbal" },
    PHOTO:     { label: "Photo" },
    OTHER:     { label: "Autre" },
} as const;

export const DOCUMENT_SCOPES = {
    GLOBAL:      { label: "Tous",    description: "Visible par tous les participants" },
    CLIENT:      { label: "Client",  description: "Visible par le pilote et le client" },
    WORKPACKAGE: { label: "Lot",     description: "Visible par le pilote et le sous-traitant du lot" },
} as const;

export type DocumentCategory = keyof typeof DOCUMENT_CATEGORIES;
export type DocumentScope     = keyof typeof DOCUMENT_SCOPES;
export type DocumentRequestStatus = "PENDING" | "FULFILLED" | "CANCELLED";
