"use client";

import { createContext, useContext } from "react";
import type { ProjectEditorData, WorkPackageItem } from "@/lib/actions/project-editor";
import type { LibraryTree, WorkPackageTemplateRef } from "@/lib/actions/work-item-templates";

export type PriceMode = "ht" | "ttc";

type EditorContextValue = {
    orgSlug: string;
    projectSlug: string;
    projectId: string;
    projectDefaultMarginRate: number | null;
    workPackages: WorkPackageItem[];
    libraryTree: LibraryTree;
    workPackageTemplates: WorkPackageTemplateRef[];
    priceMode: PriceMode;
    onRefresh: () => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({
    children,
    orgSlug,
    projectSlug,
    data,
    priceMode,
    onRefresh,
}: {
    children: React.ReactNode;
    orgSlug: string;
    projectSlug: string;
    data: ProjectEditorData;
    priceMode: PriceMode;
    onRefresh: () => void;
}) {
    return (
        <EditorContext.Provider
            value={{
                orgSlug,
                projectSlug,
                projectId: data.project.id,
                projectDefaultMarginRate: data.project.defaultMarginRate
                    ? parseFloat(data.project.defaultMarginRate)
                    : null,
                workPackages: data.workPackages,
                libraryTree: data.libraryTree,
                workPackageTemplates: data.workPackageTemplates,
                priceMode,
                onRefresh,
            }}
        >
            {children}
        </EditorContext.Provider>
    );
}

export function useEditor() {
    const ctx = useContext(EditorContext);
    if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
    return ctx;
}
