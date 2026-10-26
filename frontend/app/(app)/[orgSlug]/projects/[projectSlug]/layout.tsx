import { redirect } from "next/navigation";
import { resolveProjectAccess } from "@/lib/actions/projects";
import { SetActiveProject } from "@/lib/context/active-project";

type Props = {
    children: React.ReactNode;
    params: Promise<{ orgSlug: string; projectSlug: string }>;
};

export default async function ProjectLayout({ children, params }: Props) {
    const { orgSlug, projectSlug } = await params;

    const access = await resolveProjectAccess(orgSlug, projectSlug);
    if (!access) redirect(`/${orgSlug}/projects`);

    return (
        <>
            <SetActiveProject
                id={access.projectId}
                slug={access.projectSlug}
                name={access.projectName}
                participantRole={access.callerParticipantRole}
            />
            {children}
        </>
    );
}
