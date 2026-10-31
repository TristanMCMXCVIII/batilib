"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileX } from "lucide-react";
import { FilterPill, type FilterOption } from "@/components/ui/filter-pill";
import { OrgDocumentCard } from "./org-document-card";
import { OrgStorageBar } from "./org-storage-bar";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/document-constants";
import type { OrgDocumentsData } from "@/lib/actions/project-documents";

type Props = {
    orgSlug: string;
    initialData: OrgDocumentsData;
};

export default function OrgDocumentsClient({ orgSlug, initialData }: Props) {
    const router = useRouter();
    const [data, setData] = useState(initialData);

    const [projectFilter, setProjectFilter] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    // Options projet
    const projectOptions: FilterOption[] = data.projects.map((p) => ({
        value: p.slug,
        label: p.name,
    }));

    // Options catégories présentes uniquement
    const presentCategoryOptions = (Object.entries(DOCUMENT_CATEGORIES) as [DocumentCategory, { label: string }][])
        .filter(([key]) => data.documents.some((d) => d.category === key))
        .map(([key, { label }]) => ({ value: key, label }));

    // Filtrage
    const filteredDocs = data.documents.filter((d) => {
        if (projectFilter.length > 0 && !projectFilter.includes(d.projectSlug)) return false;
        if (categoryFilter.length > 0 && !categoryFilter.includes(d.category)) return false;
        return true;
    });

    const hasActiveFilters = projectFilter.length > 0 || categoryFilter.length > 0;

    function handleRefresh() {
        router.refresh();
    }

    return (
        <main className="page-outer pt-8 pb-10">
            <div className="max-w-4xl">

                {/* En-tête */}
                <div className="mb-8">
                    <h1 className="page-title">Documents</h1>
                    <p className="mt-1 caption">
                        Tous les documents déposés sur vos projets.
                    </p>
                    <div className="mt-4">
                        <OrgStorageBar usedBytes={data.storageBytes} />
                    </div>
                </div>

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

                        <div className="flex items-center gap-1.5">
                            {projectOptions.length > 1 && (
                                <FilterPill
                                    label="Projet"
                                    options={projectOptions}
                                    selected={projectFilter}
                                    onChange={setProjectFilter}
                                />
                            )}
                            {presentCategoryOptions.length > 0 && (
                                <FilterPill
                                    label="Catégorie"
                                    options={presentCategoryOptions}
                                    selected={categoryFilter}
                                    onChange={setCategoryFilter}
                                />
                            )}
                            {hasActiveFilters && (
                                <button
                                    onClick={() => { setProjectFilter([]); setCategoryFilter([]); }}
                                    className="rounded-full px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Réinitialiser
                                </button>
                            )}
                        </div>
                    </div>

                    {data.documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-20 text-center">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                                <FileX className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="body-sm font-medium">Aucun document déposé</p>
                            <p className="mt-1 caption max-w-xs">
                                Les documents déposés sur vos projets apparaîtront ici.
                            </p>
                        </div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-16 text-center">
                            <FileX className="h-5 w-5 text-muted-foreground mb-2" />
                            <p className="body-sm font-medium">Aucun document pour ces filtres</p>
                            <p className="mt-0.5 caption">Modifiez les filtres pour voir d'autres résultats.</p>
                        </div>
                    ) : (
                        <div className="-mx-3">
                            {filteredDocs.map((doc) => (
                                <OrgDocumentCard
                                    key={doc.id}
                                    doc={doc}
                                    orgSlug={orgSlug}
                                    onRefresh={handleRefresh}
                                />
                            ))}
                        </div>
                    )}
                </section>

            </div>
        </main>
    );
}
