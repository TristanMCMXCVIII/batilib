"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { ArrowRight, FolderOpen, Plus } from "lucide-react";
import { createProject, type ProjectListItem, type ProjectParticipantRole } from "@/lib/actions/projects";

const ROLE_LABELS: Record<ProjectParticipantRole, string> = {
    LEAD: "Maître d'œuvre",
    CLIENT: "Client",
    SUBCONTRACTOR: "Sous-traitant",
};

const ROLE_VARIANTS: Record<ProjectParticipantRole, "info" | "neutral" | "warning"> = {
    LEAD: "info",
    CLIENT: "neutral",
    SUBCONTRACTOR: "warning",
};

type Props = {
    projects: ProjectListItem[];
    orgSlug: string;
};

export default function ProjectsClient({ projects, orgSlug }: Props) {
    const router = useRouter();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleOpenSheet() {
        setProjectName("");
        setError(null);
        setSheetOpen(true);
    }

    function handleCreate() {
        setError(null);
        startTransition(async () => {
            const result = await createProject(orgSlug, projectName);
            if ("error" in result) {
                setError(result.error);
                return;
            }
            setSheetOpen(false);
            router.push(`/${orgSlug}/projects/${result.projectSlug}`);
        });
    }

    return (
        <main className="page-outer pt-8 pb-10">
            <div className="max-w-5xl">
                <div className="mb-8 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="page-title">Projets</h1>
                        <p className="mt-2 caption">
                            Retrouvez l&apos;ensemble des projets de votre organisation.
                        </p>
                    </div>
                    <Button size="sm" onClick={handleOpenSheet}>
                        <Plus className="h-4 w-4" />
                        Nouveau projet
                    </Button>
                </div>

                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl bg-subtle border border-border/50 py-20 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                            <FolderOpen className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="body-sm font-medium">Aucun projet</p>
                        <p className="mt-1 caption max-w-xs">
                            Créez votre premier projet ou attendez d&apos;être invité à en rejoindre un.
                        </p>
                        <Button size="sm" variant="outline" className="mt-6" onClick={handleOpenSheet}>
                            <Plus className="h-4 w-4" />
                            Nouveau projet
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/${orgSlug}/projects/${project.slug}`}
                                className="flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:bg-subtle"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-subtle flex-shrink-0">
                                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="body-sm font-medium text-foreground">
                                            {project.name}
                                        </p>
                                        <p className="caption mt-0.5">
                                            Créé le{" "}
                                            {new Date(project.createdAt).toLocaleDateString("fr-FR", {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={ROLE_VARIANTS[project.participantRole]}>
                                        {ROLE_LABELS[project.participantRole]}
                                    </Badge>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <Sheet
                open={sheetOpen}
                onOpenChange={(open) => {
                    if (!isPending) setSheetOpen(open);
                }}
            >
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Nouveau projet</SheetTitle>
                        <SheetDescription>
                            Donnez un nom à votre projet. Vous pourrez configurer les détails une fois le
                            projet créé.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-8 space-y-5 px-1">
                        <div className="flex flex-col gap-2.5">
                            <Label htmlFor="project-name">Nom du projet</Label>
                            <Input
                                id="project-name"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="Ex : Rénovation immeuble Dupont"
                                disabled={isPending}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && projectName.trim()) handleCreate();
                                }}
                                autoFocus
                            />
                            {error && <p className="text-error">{error}</p>}
                        </div>
                        <Button
                            onClick={handleCreate}
                            disabled={isPending || !projectName.trim()}
                            className="w-full"
                        >
                            {isPending ? "Création…" : "Créer le projet"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </main>
    );
}
