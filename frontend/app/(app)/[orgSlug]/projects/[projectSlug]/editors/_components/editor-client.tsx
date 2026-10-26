"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectEditorData, ProjectSpaceItem, WorkPackageItem } from "@/lib/actions/project-editor";
import { EditorProvider } from "./editor-context";
import SpaceView from "./space-view";
import PackageView from "./package-view";

type View = "space" | "lot";

type Props = {
    orgSlug: string;
    projectSlug: string;
    data: ProjectEditorData;
};

export default function LeadEditorClient({ orgSlug, projectSlug, data }: Props) {
    const router = useRouter();
    const [view, setView] = useState<View>("space");
    const [spaces, setSpaces] = useState<ProjectSpaceItem[]>(() => data.spaces);
    const [workPackages, setWorkPackages] = useState<WorkPackageItem[]>(() => data.workPackages);

    useEffect(() => {
        setSpaces(data.spaces);
        setWorkPackages(data.workPackages);
    }, [data]);

    function onRefresh() {
        router.refresh();
    }

    return (
        <EditorProvider
            orgSlug={orgSlug}
            projectSlug={projectSlug}
            data={{ ...data, workPackages }}
            onRefresh={onRefresh}
        >
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-border">
                    <div>
                        <h1 className="page-title">{data.project.name}</h1>
                        <p className="mt-1 caption">Éditeur de projet</p>
                    </div>
                    {/* View toggle */}
                    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-subtle">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setView("space")}
                            className={
                                view === "space"
                                    ? "bg-background shadow-sm text-foreground h-7 px-3"
                                    : "text-muted-foreground h-7 px-3 hover:bg-background/60"
                            }
                        >
                            <Layers className="h-3.5 w-3.5 mr-1.5" />
                            Par espace
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setView("lot")}
                            className={
                                view === "lot"
                                    ? "bg-background shadow-sm text-foreground h-7 px-3"
                                    : "text-muted-foreground h-7 px-3 hover:bg-background/60"
                            }
                        >
                            <Package className="h-3.5 w-3.5 mr-1.5" />
                            Par lot
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    {view === "space" ? (
                        <SpaceView
                            spaces={spaces}
                            setSpaces={setSpaces}
                        />
                    ) : (
                        <PackageView
                            workPackages={workPackages}
                            setWorkPackages={setWorkPackages}
                        />
                    )}
                </div>
            </div>
        </EditorProvider>
    );
}
