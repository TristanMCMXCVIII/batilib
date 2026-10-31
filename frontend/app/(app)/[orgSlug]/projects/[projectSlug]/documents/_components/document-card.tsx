"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    File,
    FileText,
    Image,
    FileSpreadsheet,
    MoreHorizontal,
    Download,
    Trash2,
    ExternalLink,
    Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteProjectDocument, type DocumentItem } from "@/lib/actions/project-documents";
import { DOCUMENT_CATEGORIES, DOCUMENT_SCOPES } from "@/lib/document-constants";
import { LOT_COLOR_MAP } from "@/lib/lot-colors";
import type { LotColorKey } from "@/lib/lot-colors";
import { cn } from "@/lib/utils";

function participantRoleLabel(role: string): string {
    if (role === "LEAD") return "Pilote";
    if (role === "CLIENT") return "Client";
    if (role === "SUBCONTRACTOR") return "Sous-traitant";
    return role;
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
    if (mimeType.startsWith("image/")) return <Image className={className} />;
    if (mimeType === "application/pdf" || mimeType.includes("text")) return <FileText className={className} />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
        return <FileSpreadsheet className={className} />;
    return <File className={className} />;
}

function formatBytes(bytesStr: string): string {
    const b = parseInt(bytesStr, 10);
    if (isNaN(b) || b === 0) return "—";
    if (b < 1024) return `${b} o`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)} Go`;
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

type Props = {
    doc: DocumentItem;
    isLead: boolean;
    orgSlug: string;
    projectSlug: string;
    onRefresh: () => void;
};

export function DocumentCard({ doc, isLead, orgSlug, projectSlug, onRefresh }: Props) {
    const router = useRouter();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const categoryLabel = DOCUMENT_CATEGORIES[doc.category]?.label ?? doc.category;
    const scopeLabel = DOCUMENT_SCOPES[doc.scope]?.label ?? doc.scope;
    const dotColor =
        doc.workPackageColor && LOT_COLOR_MAP[doc.workPackageColor as LotColorKey]
            ? LOT_COLOR_MAP[doc.workPackageColor as LotColorKey].hex
            : undefined;

    async function handleDelete() {
        setDeleting(true);
        setDeleteError(null);
        const result = await deleteProjectDocument(orgSlug, projectSlug, doc.id);
        setDeleting(false);
        if (result.error) {
            setDeleteError(result.error);
            return;
        }
        setDeleteOpen(false);
        onRefresh();
        router.refresh();
    }

    return (
        <>
            <div className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-subtle">
                {/* Icône fichier */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-subtle border border-border/50 group-hover:bg-background">
                    <FileIcon
                        mimeType={doc.mimeType}
                        className="h-4 w-4 text-muted-foreground"
                    />
                </div>

                {/* Contenu principal */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="body-sm truncate font-medium">{doc.name}</span>
                        <Badge variant="neutral" className="shrink-0 text-xs px-1.5 py-0">
                            {categoryLabel}
                        </Badge>
                        {doc.scope !== "GLOBAL" && (
                            <Badge
                                variant={doc.scope === "CLIENT" ? "info" : "neutral"}
                                className="shrink-0 text-xs px-1.5 py-0"
                            >
                                {doc.workPackageName ? (
                                    <span className="flex items-center gap-1">
                                        {dotColor && (
                                            <span
                                                className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                                                style={{ backgroundColor: dotColor }}
                                            />
                                        )}
                                        {doc.workPackageName}
                                    </span>
                                ) : (
                                    scopeLabel
                                )}
                            </Badge>
                        )}
                    </div>
                    <p className="caption mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {formatBytes(doc.sizeBytes)}
                        <span>·</span>
                        <span>
                            {doc.uploaderOrgName}
                            {doc.uploaderParticipantRole && (
                                <span className="text-muted-foreground/70"> ({participantRoleLabel(doc.uploaderParticipantRole)})</span>
                            )}
                        </span>
                        <span>·</span>
                        {formatDate(doc.createdAt)}
                        {doc.linkedRequestNote && (
                            <>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                    <Lock className="h-3 w-3 shrink-0" />
                                    {`«\u00a0${doc.linkedRequestNote}\u00a0»`}
                                    {doc.linkedRequestedByOrgName && (
                                        <span className="text-muted-foreground/70">à la demande de {doc.linkedRequestedByOrgName}</span>
                                    )}
                                </span>
                            </>
                        )}
                    </p>
                </div>

                {/* Actions */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 hover:bg-hover">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                            onClick={() => window.open(`/api/files/${doc.fileKey}`, "_blank")}
                        >
                            <ExternalLink className="h-3.5 w-3.5 mr-2" />
                            Ouvrir
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                const a = document.createElement("a");
                                a.href = `/api/files/${doc.fileKey}`;
                                a.download = doc.name;
                                a.click();
                            }}
                        >
                            <Download className="h-3.5 w-3.5 mr-2" />
                            Télécharger
                        </DropdownMenuItem>
                        {isLead && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteOpen(true)}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    Supprimer
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Dialog confirmation suppression */}
            <Dialog open={deleteOpen} onOpenChange={(o) => { if (!deleting) setDeleteOpen(o); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex flex-col gap-0.5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-destructive">Attention</p>
                            <DialogTitle>Supprimer le document</DialogTitle>
                        </div>
                        <DialogDescription>
                            Le fichier <strong className="text-foreground">{doc.name}</strong> sera supprimé définitivement.
                            Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteError && <p className="text-error text-sm">{deleteError}</p>}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? "Suppression…" : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
