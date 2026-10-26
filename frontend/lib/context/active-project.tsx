"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ProjectParticipantRole = "LEAD" | "CLIENT" | "SUBCONTRACTOR";

type ActiveProject = {
    id: string;
    slug: string;
    name: string;
    participantRole: ProjectParticipantRole;
} | null;

type ActiveProjectContextValue = {
    activeProject: ActiveProject;
    setActiveProject: (p: ActiveProject) => void;
};

const ActiveProjectContext = createContext<ActiveProjectContextValue>({
    activeProject: null,
    setActiveProject: () => {},
});

export function ActiveProjectProvider({ children }: { children: React.ReactNode }) {
    const [activeProject, setActiveProject] = useState<ActiveProject>(null);
    return (
        <ActiveProjectContext.Provider value={{ activeProject, setActiveProject }}>
            {children}
        </ActiveProjectContext.Provider>
    );
}

export function useActiveProject() {
    return useContext(ActiveProjectContext);
}

export function SetActiveProject({
    id,
    slug,
    name,
    participantRole,
}: {
    id: string;
    slug: string;
    name: string;
    participantRole: ProjectParticipantRole;
}) {
    const { setActiveProject } = useContext(ActiveProjectContext);

    useEffect(() => {
        setActiveProject({ id, slug, name, participantRole });
        return () => setActiveProject(null);
    }, [id, slug, name, participantRole, setActiveProject]);

    return null;
}
