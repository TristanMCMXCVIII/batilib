"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCheck, X, Trash2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    cancelDocumentRequest,
    deleteDocumentRequest,
    type DocumentRequestItem,
} from "@/lib/actions/project-documents";
import { DOCUMENT_CATEGORIES } from "@/lib/document-constants";

function participantRoleLabel(role: string): string {
    if (role === "LEAD") return "Pilote";
    if (role === "CLIENT") return "Client";
    if (role === "SUBCONTRACTOR") return "Sous-traitant";
    return role;
}

function formatDate(isoStr: string): string {
    try {
        return new Date(isoStr).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return isoStr;
    }
}

function formatDateTime(isoStr: string): string {
    try {
        const d = new Date(isoStr);
        const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
        const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return `${date} à ${time}`;
    } catch {
        return isoStr;
    }
}

function isDueDatePast(dueDateStr: string | null): boolean {
    if (!dueDateStr) return false;
    return new Date(dueDateStr) < new Date();
}

type Props = {
    request: DocumentRequestItem;
    isLead: boolean;
    orgSlug: string;
    projectSlug: string;
    onRefresh: () => void;
};

export function RequestCard({ request, isLead, orgSlug, projectSlug, onRefresh }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const categoryLabel = DOCUMENT_CATEGORIES[request.category]?.label ?? request.category;
    const isFulfilled = request.status === "FULFILLED";
    const isOverdue = !isFulfilled && isDueDatePast(request.dueDate);

    // "Demandé à Organisation X (Client)"
    const toLabel = request.requestedFromRole === "SUBCONTRACTOR" && request.requestedFromWorkPackageName
        ? `${request.requestedFromOrgName ?? "Sous-traitant"} (Lot\u00a0${request.requestedFromWorkPackageName})`
        : `${request.requestedFromOrgName ?? participantRoleLabel(request.requestedFromRole)} (${participantRoleLabel(request.requestedFromRole)})`;

    // "par Organisation Y (Pilote)"
    const byLabel = `${request.requestedByOrgName} (${participantRoleLabel(request.requestedByParticipantRole)})`;

    async function handleCancel() {
        setLoading(true);
        await cancelDocumentRequest(orgSlug, projectSlug, request.id);
        setLoading(false);
        onRefresh();
        router.refresh();
    }

    async function handleDelete() {
        setLoading(true);
        await deleteDocumentRequest(orgSlug, projectSlug, request.id);
        setLoading(false);
        onRefresh();
        router.refresh();
    }

    return (
        <div className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-subtle ${isFulfilled ? "opacity-70" : ""}`}>
            {/* Icône statut */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subtle border border-border/50 group-hover:bg-background">
                {isFulfilled
                    ? <CheckCheck className="h-4 w-4 text-muted-foreground" />
                    : <Clock className="h-4 w-4 text-muted-foreground" />
                }
            </div>

            {/* Contenu principal */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="body-sm truncate font-medium">{request.label}</span>
                    <Badge variant="neutral" className="shrink-0 text-xs px-1.5 py-0">
                        {categoryLabel}
                    </Badge>
                    {isFulfilled
                        ? <Badge variant="success" className="shrink-0 text-xs px-1.5 py-0">Fourni</Badge>
                        : <Badge variant="warning" className="shrink-0 text-xs px-1.5 py-0">En attente</Badge>
                    }
                </div>
                <p className="caption mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {isFulfilled ? (
                        <>
                            <span>
                                Fourni par <span className="font-medium text-foreground">{request.fulfilledByOrgName ?? "—"}</span>
                            </span>
                            {request.fulfilledAt && (
                                <>
                                    <span>·</span>
                                    <span>{formatDateTime(request.fulfilledAt)}</span>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <span>Demandé à <span className="font-medium text-foreground">{toLabel}</span></span>
                            <span>·</span>
                            <span>par <span className="font-medium text-foreground">{byLabel}</span></span>
                            {request.dueDate && (
                                <>
                                    <span>·</span>
                                    <span className={`font-medium ${isOverdue ? "text-destructive" : "text-warning"}`}>
                                        Échéance {formatDate(request.dueDate)}{isOverdue && " (dépassée)"}
                                    </span>
                                </>
                            )}
                        </>
                    )}
                </p>
            </div>

            {/* Actions LEAD */}
            {isLead && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 hover:bg-hover"
                            disabled={loading}
                        >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {isFulfilled ? (
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={handleDelete}
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Supprimer
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={handleCancel}
                            >
                                <X className="h-3.5 w-3.5 mr-2" />
                                Annuler la demande
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
