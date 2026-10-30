"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, File, FileText, Image, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { registerProjectDocument, type WorkPackageRef, type DocumentRequestItem } from "@/lib/actions/project-documents";
import { DOCUMENT_CATEGORIES, DOCUMENT_SCOPES, type DocumentCategory, type DocumentScope } from "@/lib/document-constants";
import { cn } from "@/lib/utils";

const BLOCKED_EXTENSIONS = new Set([
    ".exe", ".msi", ".bat", ".cmd", ".com", ".ps1", ".vbs", ".wsf", ".scr", ".pif", ".reg",
    ".sh", ".bash", ".zsh", ".csh", ".ksh", ".fish",
    ".app", ".dmg", ".pkg", ".command",
    ".dll", ".so", ".dylib",
    ".jar", ".class",
    ".apk", ".ipa",
]);

function getExtension(filename: string): string {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : "";
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
    if (mimeType.startsWith("image/")) return <Image className={className} />;
    if (mimeType === "application/pdf" || mimeType.includes("text")) return <FileText className={className} />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <FileSpreadsheet className={className} />;
    return <File className={className} />;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orgSlug: string;
    projectSlug: string;
    workPackages: WorkPackageRef[];
    pendingRequests: DocumentRequestItem[];
    onSuccess: () => void;
};

export function UploadDocumentSheet({ open, onOpenChange, orgSlug, projectSlug, workPackages, pendingRequests, onSuccess }: Props) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [category, setCategory] = useState<DocumentCategory>("OTHER");
    const [scope, setScope] = useState<DocumentScope>("GLOBAL");
    const [workPackageId, setWorkPackageId] = useState("");
    const [linkedRequestId, setLinkedRequestId] = useState("");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function reset() {
        setFile(null);
        setFileError(null);
        setName("");
        setCategory("OTHER");
        setScope("GLOBAL");
        setWorkPackageId("");
        setLinkedRequestId("");
        setError(null);
        setUploading(false);
    }

    function handleOpenChange(o: boolean) {
        if (!uploading) {
            if (!o) reset();
            onOpenChange(o);
        }
    }

    function selectFile(f: File) {
        setFileError(null);
        const ext = getExtension(f.name);
        if (BLOCKED_EXTENSIONS.has(ext)) {
            setFileError("Ce type de fichier n'est pas autorisé.");
            return;
        }
        setFile(f);
        // Pré-remplir le nom sans extension
        const nameWithoutExt = f.name.replace(/\.[^.]+$/, "");
        setName(nameWithoutExt);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) selectFile(f);
    }

    async function handleSubmit() {
        if (!file) return;

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError("Le nom est requis");
            return;
        }
        if (scope === "WORKPACKAGE" && !workPackageId) {
            setError("Sélectionnez un lot");
            return;
        }

        setUploading(true);
        setError(null);

        // 1. Upload vers R2
        const formData = new FormData();
        formData.append("file", file);
        formData.append("orgSlug", orgSlug);
        formData.append("projectSlug", projectSlug);

        const res = await fetch("/api/upload/project-document", { method: "POST", body: formData });
        const uploadData = await res.json();

        if (!res.ok) {
            setError(uploadData.error ?? "Erreur lors de l'upload");
            setUploading(false);
            return;
        }

        // 2. Enregistrement en DB
        const result = await registerProjectDocument(orgSlug, projectSlug, {
            name: trimmedName,
            category,
            scope,
            workPackageId: scope === "WORKPACKAGE" ? workPackageId : null,
            fileKey: uploadData.fileKey,
            sizeBytes: uploadData.sizeBytes,
            mimeType: uploadData.mimeType,
            linkedRequestId: linkedRequestId || null,
        });

        setUploading(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        reset();
        onOpenChange(false);
        onSuccess();
        router.refresh();
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent className="flex flex-col">
                <SheetHeader>
                    <SheetTitle>Déposer un document</SheetTitle>
                    <SheetDescription>
                        Ajoutez un fichier au projet et définissez qui peut le consulter.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 flex-1 overflow-y-auto space-y-5 px-1 pb-6">
                    {/* Zone de dépôt */}
                    <div className="flex flex-col gap-2">
                        <Label>Fichier</Label>
                        {!file ? (
                            <div
                                className={cn(
                                    "flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 text-center cursor-pointer transition-colors",
                                    dragging
                                        ? "border-foreground bg-subtle"
                                        : "border-border hover:border-foreground/40 hover:bg-subtle",
                                )}
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                                <p className="body-sm font-medium">Glissez un fichier ici</p>
                                <p className="caption mt-1">ou cliquez pour sélectionner</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) selectFile(f); }}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 rounded-xl border border-border bg-subtle px-4 py-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border border-border/50">
                                    <FileIcon mimeType={file.type} className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="body-sm truncate font-medium">{file.name}</p>
                                    <p className="caption">{formatBytes(file.size)}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setFile(null); setName(""); }}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        {fileError && <p className="text-error">{fileError}</p>}
                    </div>

                    {/* Nom affiché */}
                    <div className="flex flex-col gap-2.5">
                        <Label htmlFor="doc-name">Nom du document</Label>
                        <Input
                            id="doc-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex. Plan de masse RDC"
                            disabled={uploading}
                        />
                    </div>

                    {/* Catégorie */}
                    <div className="flex flex-col gap-2.5">
                        <Label>Catégorie</Label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {(Object.entries(DOCUMENT_CATEGORIES) as [DocumentCategory, { label: string }][]).map(([key, { label }]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setCategory(key)}
                                    disabled={uploading}
                                    className={cn(
                                        "rounded-lg border px-2 py-1.5 text-xs font-medium text-center transition-colors",
                                        category === key
                                            ? "border-foreground bg-foreground text-background"
                                            : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Visibilité */}
                    <div className="flex flex-col gap-2.5">
                        <Label>Visibilité</Label>
                        <div className="space-y-1.5">
                            {(Object.entries(DOCUMENT_SCOPES) as [DocumentScope, { label: string; description: string }][]).map(([key, { label, description }]) => {
                                const disabled = key === "WORKPACKAGE" && workPackages.length === 0;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => { if (!disabled) setScope(key); }}
                                        disabled={uploading || disabled}
                                        className={cn(
                                            "w-full flex items-start gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors",
                                            scope === key && !disabled
                                                ? "border-foreground bg-subtle"
                                                : disabled
                                                ? "border-border opacity-40 cursor-not-allowed"
                                                : "border-border hover:border-foreground/40 hover:bg-subtle",
                                        )}
                                    >
                                        <div className={cn(
                                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                            scope === key && !disabled ? "border-foreground" : "border-border",
                                        )}>
                                            {scope === key && !disabled && (
                                                <div className="h-2 w-2 rounded-full bg-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium leading-none">{label}</p>
                                            <p className="caption mt-0.5">{description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sélecteur de lot (si scope = WORKPACKAGE) */}
                    {scope === "WORKPACKAGE" && (
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="doc-wp">Lot</Label>
                            <select
                                id="doc-wp"
                                value={workPackageId}
                                onChange={(e) => setWorkPackageId(e.target.value)}
                                disabled={uploading}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="">Sélectionner un lot…</option>
                                {workPackages.map((wp) => (
                                    <option key={wp.id} value={wp.id}>{wp.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* En réponse à une demande (optionnel) */}
                    {pendingRequests.length > 0 && (
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="doc-request">
                                En réponse à une demande{" "}
                                <span className="caption">(optionnel)</span>
                            </Label>
                            <select
                                id="doc-request"
                                value={linkedRequestId}
                                onChange={(e) => setLinkedRequestId(e.target.value)}
                                disabled={uploading}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="">Aucune demande liée</option>
                                {pendingRequests.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                            {linkedRequestId && (
                                <p className="caption text-success">
                                    La demande sera automatiquement marquée comme fournie.
                                </p>
                            )}
                        </div>
                    )}

                    {error && <p className="text-error">{error}</p>}

                    <Button
                        onClick={handleSubmit}
                        disabled={uploading || !file || !name.trim()}
                        className="w-full"
                    >
                        {uploading ? "Envoi en cours…" : "Déposer le document"}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
