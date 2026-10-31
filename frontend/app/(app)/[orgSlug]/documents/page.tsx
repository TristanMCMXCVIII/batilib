import { notFound } from "next/navigation";
import { getOrgDocuments } from "@/lib/actions/project-documents";
import OrgDocumentsClient from "./_components/org-documents-client";

type Props = { params: Promise<{ orgSlug: string }> };

export default async function OrgDocumentsPage({ params }: Props) {
    const { orgSlug } = await params;

    const data = await getOrgDocuments(orgSlug);
    if (!data) notFound();

    return <OrgDocumentsClient orgSlug={orgSlug} initialData={data} />;
}
