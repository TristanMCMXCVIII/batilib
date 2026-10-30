import { notFound } from "next/navigation";
import { resolveProjectAccess } from "@/lib/actions/projects";
import { getProjectDocuments } from "@/lib/actions/project-documents";
import DocumentsClient from "./_components/documents-client";

type Props = { params: Promise<{ orgSlug: string; projectSlug: string }> };

export default async function ProjectDocumentsPage({ params }: Props) {
    const { orgSlug, projectSlug } = await params;

    const access = await resolveProjectAccess(orgSlug, projectSlug);
    if (!access) notFound();

    const data = await getProjectDocuments(orgSlug, projectSlug);
    if (!data) notFound();

    return (
        <DocumentsClient
            orgSlug={orgSlug}
            projectSlug={projectSlug}
            projectName={access.projectName}
            initialData={data}
        />
    );
}
