import { notFound } from "next/navigation";
import { resolveProjectAccess } from "@/lib/actions/projects";
import { getProjectEditorData } from "@/lib/actions/project-editor";
import LeadEditorClient from "./_components/editor-client";
import ClientProjectView from "./_components/client-project-view";

type Props = { params: Promise<{ orgSlug: string; projectSlug: string }> };

export default async function EditorsPage({ params }: Props) {
    const { orgSlug, projectSlug } = await params;

    const access = await resolveProjectAccess(orgSlug, projectSlug);
    if (!access) notFound();

    const data = await getProjectEditorData(orgSlug, projectSlug);
    if (!data) notFound();

    if (access.callerParticipantRole === "CLIENT") {
        return <ClientProjectView data={data} />;
    }

    // LEAD (et SUBCONTRACTOR en attendant sa propre vue)
    return (
        <LeadEditorClient
            orgSlug={orgSlug}
            projectSlug={projectSlug}
            data={data}
        />
    );
}
