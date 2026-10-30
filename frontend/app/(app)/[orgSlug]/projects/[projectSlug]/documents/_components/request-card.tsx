"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCheck, X, ChevronDown, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    cancelDocumentRequest,
    fulfillDocumentRequest,
    type DocumentRequestItem,
} from "@/lib/actions/project-documents";
import { DOCUMENT_CATEGORIES } from "@/lib/document-constants";

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
    const isOverdue = request.status === "PENDING" && isDueDatePast(request.dueDate);

    const targetLabel =
        request.requestedFromRole === "CLIENT"
            ? "Client"
            : request.requestedFromRole === "LEAD"
            ? "Pilote"
            : request.requestedFromWorkPackageName ?? "Sous-traitant";

    async function handleCancel() {
        setLoading(true);
        await cancelDocumentRequest(orgSlug, projectSlug, request.id);
        setLoading(false);
        onRefresh();
        router.refresh();
    }

    async function handleFulfill() {
        setLoading(true);
        await fulfillDocumentRequest(orgSlug, projectSlug, request.id);
        setLoading(false);
        onRefresh();
        router.refresh();
    }

    const isFulfilled = request.status === "FULFILLED";

    return (
        <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${isFulfilled ? "border-border/40 bg-subtle/50 opacity-70" : "border-border/60 bg-background"}`}>
            {/* Icône statut */}
            {isFulfilled ? (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-50 border border-green-200">
                    <CheckCheck className="h-3.5 w-3.5 text-green-600" />
                </div>
            ) : (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                </div>
            )}

            {/* Contenu */}
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <p className="body-sm font-medium leading-snug">{request.label}</p>
                    <div className="flex shrink-0 items-center gap-1.5">
                        <Badge variant="neutral" className="text-xs px-1.5 py-0">{categoryLabel}</Badge>
                        {isFulfilled ? (
                            <Badge variant="success" className="text-xs px-1.5 py-0">Fourni</Badge>
                        ) : (
                            <Badge variant="warning" className="text-xs px-1.5 py-0">En attente</Badge>
                        )}
                    </div>
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <p className="caption">
                        Demandé à <span className="font-medium text-foreground">{targetLabel}</span>
                        <span className="mx-1.5">·</span>
                        par {request.requestedByName}
                    </p>
                    {!isFulfilled && request.dueDate && (
                        <p className={`caption font-medium ${isOverdue ? "text-destructive" : "text-warning"}`}>
                            · Échéance {formatDate(request.dueDate)}
                            {isOverdue && " (dépassée)"}
                        </p>
                    )}
                </div>
            </div>

            {/* Actions LEAD */}
            {isLead && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="shrink-0 h-7 px-2 text-xs" disabled={loading}>
                            Actions
                            <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        {!isFulfilled && (
                            <>
                                <DropdownMenuItem onClick={handleFulfill}>
                                    <CheckCheck className="h-3.5 w-3.5 mr-2 text-success" />
                                    Marquer comme fourni
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleCancel}>
                                    <X className="h-3.5 w-3.5 mr-2" />
                                    Annuler la demande
                                </DropdownMenuItem>
                            </>
                        )}
                        {isFulfilled && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleCancel}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Supprimer
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
