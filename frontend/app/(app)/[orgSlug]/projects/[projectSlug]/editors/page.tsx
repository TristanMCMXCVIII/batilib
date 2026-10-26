import { notFound } from "next/navigation";
import { getProjectEditorData } from "@/lib/actions/project-editor";
import EditorClient from "./_components/editor-client";

type Props = { params: Promise<{ orgSlug: string; projectSlug: string }> };

export default async function EditorsPage({ params }: Props) {
    const { orgSlug, projectSlug } = await params;
    const data = await getProjectEditorData(orgSlug, projectSlug);
    if (!data) notFound();

    return (
        <EditorClient
            orgSlug={orgSlug}
            projectSlug={projectSlug}
            data={data}
        />
    );
}
