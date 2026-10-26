import { notFound } from "next/navigation";
import { getProjectMembers, getProjectClientInvitation } from "@/lib/actions/project-members";
import ProjectMembersClient from "./_components/project-members-client";

type Props = { params: Promise<{ orgSlug: string; projectSlug: string }> };

export default async function ProjectMembersPage({ params }: Props) {
    const { orgSlug, projectSlug } = await params;

    const [data, clientInvitation] = await Promise.all([
        getProjectMembers(orgSlug, projectSlug),
        getProjectClientInvitation(orgSlug, projectSlug),
    ]);

    if (!data) notFound();

    return (
        <ProjectMembersClient
            orgSlug={orgSlug}
            projectSlug={projectSlug}
            data={data}
            clientInvitation={clientInvitation}
        />
    );
}
