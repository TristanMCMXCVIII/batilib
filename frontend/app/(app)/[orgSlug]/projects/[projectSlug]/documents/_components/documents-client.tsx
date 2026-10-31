"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, MessageSquarePlus, FileX, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StorageBar } from "./storage-bar";
import { DocumentCard } from "./document-card";
import { RequestCard } from "./request-card";
import { FilterPill } from "@/components/ui/filter-pill";
import { UploadDocumentSheet } from "./upload-document-sheet";
import { RequestDocumentSheet } from "./request-document-sheet";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/document-constants";
import type { ProjectDocumentsData } from "@/lib/actions/project-documents";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isDueDatePast(dueDateStr: string | null): boolean {
    if (!dueDateStr) return false;
    return new Date(dueDateStr) < new Date();
}

// ─── Filter options ───────────────────────────────────────────────────────────

const REQUEST_STATUS_OPTIONS = [
    { value: "PENDING", label: "En attente" },
    { value: "FULFILLED", label: "Fourni" },
    { value: "OVERDUE", label: "En retard" },
];

const REQUEST_RECIPIENT_OPTIONS = [
    { value: "CLIENT", label: "Client" },
    { value: "LEAD", label: "Pilote" },
    { value: "SUBCONTRACTOR", label: "Lot" },
];

// ─── Component ───────────────────────────────────────────────────────────────

type Props = {
    orgSlug: string;
    projectSlug: string;
    projectName: string;
    initialData: ProjectDocumentsData;
};

export default function DocumentsClient({ orgSlug, projectSlug, projectName, initialData }: Props) {
    const router = useRouter();
    const [data, setData] = useState(initialData);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [requestOpen, setRequestOpen] = useState(false);

    // Filtres demandes
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [recipientFilter, setRecipientFilter] = useState<string[]>([]);

    // Filtres documents
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const isLead = data.callerParticipantRole === "LEAD";
    const hasClient = true;

    // ─── Requests filtering ───────────────────────────────────────────────────

    const pendingCount = data.requests.filter((r) => r.status === "PENDING").length;

    const filteredRequests = data.requests.filter((r) => {
        if (statusFilter.length > 0) {
            const isOverdue = r.status === "PENDING" && isDueDatePast(r.dueDate);
            const matches = statusFilter.some(
                (s) =>
                    (s === "PENDING" && r.status === "PENDING" && !isOverdue) ||
                    (s === "FULFILLED" && r.status === "FULFILLED") ||
                    (s === "OVERDUE" && isOverdue),
            );
            if (!matches) return false;
        }
        if (recipientFilter.length > 0 && !recipientFilter.includes(r.requestedFromRole)) {
            return false;
        }
        return true;
    });

    // ─── Documents filtering ──────────────────────────────────────────────────

    const filteredDocs =
        categoryFilter.length > 0
            ? data.documents.filter((d) => categoryFilter.includes(d.category))
            : data.documents;

    // Options catégories présentes uniquement
    const presentCategoryOptions = (Object.entries(DOCUMENT_CATEGORIES) as [DocumentCategory, { label: string }][])
        .filter(([key]) => data.documents.some((d) => d.category === key))
        .map(([key, { label }]) => ({ value: key, label }));

    const hasActiveDocFilters = categoryFilter.length > 0;
    const hasActiveRequestFilters = statusFilter.length > 0 || recipientFilter.length > 0;

    function handleRefresh() {
        router.refresh();
    }

    return (
        <main className="page-outer pt-8 pb-10">
            <div className="max-w-4xl">

                {/* En-tête */}
                <div className="mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="page-title">Documents</h1>
                            <p className="mt-1 caption">
                                Déposez et partagez les documents du chantier.
                            </p>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                            {isLead && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setRequestOpen(true)}
                                >
                                    <MessageSquarePlus className="h-3.5 w-3.5" />
                                    Demander
                                </Button>
                            )}
                            <Button size="sm" onClick={() => setUploadOpen(true)}>
                                <Upload className="h-3.5 w-3.5" />
                                Déposer
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <StorageBar usedBytes={data.storageBytes} />
                    </div>
                </div>

                <div className="space-y-10">

                    {/* ─── Demandes ─────────────────────────────────────────── */}
                    {data.requests.length > 0 && (
                        <section>
                            <div className="mb-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="section-title">Demandes</h2>
                                    {pendingCount > 0 && (
                                        <Badge variant="warning" className="text-xs">
                                            {pendingCount}
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <FilterPill
                                        label="Statut"
                                        options={REQUEST_STATUS_OPTIONS}
                                        selected={statusFilter}
                                        onChange={setStatusFilter}
                                    />
                                    <FilterPill
                                        label="Destinataire"
                                        options={REQUEST_RECIPIENT_OPTIONS}
                                        selected={recipientFilter}
                                        onChange={setRecipientFilter}
                                    />
                                    {hasActiveRequestFilters && (
                                        <button
                                            onClick={() => { setStatusFilter([]); setRecipientFilter([]); }}
                                            className="rounded-full px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Réinitialiser
                                        </button>
                                    )}
                                </div>
                            </div>

                            {filteredRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-10 text-center">
                                    <Inbox className="h-5 w-5 text-muted-foreground mb-2" />
                                    <p className="body-sm font-medium">Aucune demande</p>
                                    <p className="mt-0.5 caption">Modifiez les filtres pour voir d'autres résultats.</p>
                                </div>
                            ) : (
                                <div className="-mx-3">
                                    {filteredRequests.map((r) => (
                                        <RequestCard
                                            key={r.id}
                                            request={r}
                                            isLead={isLead}
                                            orgSlug={orgSlug}
                                            projectSlug={projectSlug}
                                            onRefresh={handleRefresh}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ─── Documents ────────────────────────────────────────── */}
                    <section>
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <h2 className="section-title">
                                Documents
                                {data.documents.length > 0 && (
                                    <span className="ml-2 caption font-normal">
                                        ({data.documents.length})
                                    </span>
                                )}
                            </h2>

                            <div className="flex items-center gap-1.5">
                                {presentCategoryOptions.length > 0 && (
                                    <FilterPill
                                        label="Catégorie"
                                        options={presentCategoryOptions}
                                        selected={categoryFilter}
                                        onChange={setCategoryFilter}
                                    />
                                )}
                                {hasActiveDocFilters && (
                                    <button
                                        onClick={() => setCategoryFilter([])}
                                        className="rounded-full px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Réinitialiser
                                    </button>
                                )}
                            </div>
                        </div>

                        {filteredDocs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-16 text-center">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                                    <FileX className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="body-sm font-medium">
                                    {categoryFilter.length === 0
                                        ? "Aucun document déposé"
                                        : "Aucun document pour ces filtres"}
                                </p>
                                <p className="mt-1 caption max-w-xs">
                                    {categoryFilter.length === 0
                                        ? "Déposez le premier document du projet."
                                        : "Essayez d'autres filtres ou déposez un document."}
                                </p>
                                {categoryFilter.length === 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="mt-6"
                                        onClick={() => setUploadOpen(true)}
                                    >
                                        <Upload className="h-3.5 w-3.5" />
                                        Déposer un document
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="-mx-3">
                                {filteredDocs.map((doc) => (
                                    <DocumentCard
                                        key={doc.id}
                                        doc={doc}
                                        isLead={isLead}
                                        orgSlug={orgSlug}
                                        projectSlug={projectSlug}
                                        onRefresh={handleRefresh}
                                    />
                                ))}
                            </div>
                        )}
                    </section>

                </div>
            </div>

            <UploadDocumentSheet
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                orgSlug={orgSlug}
                projectSlug={projectSlug}
                workPackages={data.workPackages}
                pendingRequests={data.requests.filter((r) => r.status === "PENDING")}
                onSuccess={handleRefresh}
            />

            {isLead && (
                <RequestDocumentSheet
                    open={requestOpen}
                    onOpenChange={setRequestOpen}
                    orgSlug={orgSlug}
                    projectSlug={projectSlug}
                    workPackages={data.workPackages}
                    hasClient={hasClient}
                    onSuccess={handleRefresh}
                />
            )}
        </main>
    );
}
