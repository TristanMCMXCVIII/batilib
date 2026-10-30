"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, MessageSquarePlus, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StorageBar } from "./storage-bar";
import { DocumentCard } from "./document-card";
import { RequestCard } from "./request-card";
import { UploadDocumentSheet } from "./upload-document-sheet";
import { RequestDocumentSheet } from "./request-document-sheet";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/document-constants";
import type { ProjectDocumentsData } from "@/lib/actions/project-documents";
import { cn } from "@/lib/utils";

type FilterCategory = "ALL" | DocumentCategory;

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
    const [activeCategory, setActiveCategory] = useState<FilterCategory>("ALL");

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const isLead = data.callerParticipantRole === "LEAD";

    // Détermine si un client participant existe sur ce projet
    // On le déduit des demandes ou de la liste de docs (pas d'accès direct ici)
    // Pour les besoins du sheet, on passe hasClient=true si LEAD (il a l'info)
    // En réalité il faudrait le vérifier server-side — pour l'instant on laisse le sheet gérer le cas
    const hasClient = true; // le sheet désactivera le bouton "Client" si pas de participant

    const pendingRequests = data.requests.filter((r) => r.status === "PENDING");
    const fulfilledRequests = data.requests.filter((r) => r.status === "FULFILLED");

    const filteredDocs =
        activeCategory === "ALL"
            ? data.documents
            : data.documents.filter((d) => d.category === activeCategory);

    // Catégories présentes dans les docs (pour afficher uniquement les filtres pertinents)
    const presentCategories = new Set(data.documents.map((d) => d.category));
    const filterCategories: FilterCategory[] = [
        "ALL",
        ...(Object.keys(DOCUMENT_CATEGORIES) as DocumentCategory[]).filter((c) => presentCategories.has(c)),
    ];

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

                    {/* Demandes en attente */}
                    {pendingRequests.length > 0 && (
                        <section>
                            <div className="mb-3 flex items-center gap-2">
                                <h2 className="section-title">Demandes en attente</h2>
                                <Badge variant="warning" className="text-xs">
                                    {pendingRequests.length}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                {pendingRequests.map((r) => (
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
                        </section>
                    )}

                    {/* Documents */}
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

                            {/* Filtres catégorie */}
                            {filterCategories.length > 1 && (
                                <div className="flex flex-wrap gap-1">
                                    {filterCategories.map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveCategory(cat)}
                                            className={cn(
                                                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                                                activeCategory === cat
                                                    ? "bg-foreground text-background"
                                                    : "bg-subtle text-muted-foreground hover:bg-hover hover:text-foreground",
                                            )}
                                        >
                                            {cat === "ALL"
                                                ? "Tous"
                                                : DOCUMENT_CATEGORIES[cat]?.label ?? cat}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {filteredDocs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-16 text-center">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                                    <FileX className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="body-sm font-medium">
                                    {activeCategory === "ALL"
                                        ? "Aucun document déposé"
                                        : `Aucun document dans la catégorie «\u00a0${DOCUMENT_CATEGORIES[activeCategory]?.label}\u00a0»`}
                                </p>
                                <p className="mt-1 caption max-w-xs">
                                    {activeCategory === "ALL"
                                        ? "Déposez le premier document du projet."
                                        : "Essayez un autre filtre ou déposez un document."}
                                </p>
                                {activeCategory === "ALL" && (
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

                    {/* Demandes résolues */}
                    {fulfilledRequests.length > 0 && (
                        <section>
                            <h2 className="section-title mb-3 text-muted-foreground">
                                Demandes résolues
                                <span className="ml-2 caption font-normal">({fulfilledRequests.length})</span>
                            </h2>
                            <div className="space-y-2">
                                {fulfilledRequests.map((r) => (
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
                        </section>
                    )}
                </div>
            </div>

            <UploadDocumentSheet
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                orgSlug={orgSlug}
                projectSlug={projectSlug}
                workPackages={data.workPackages}
                pendingRequests={pendingRequests}
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
