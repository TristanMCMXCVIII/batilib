import { getWorkTemplates } from "@/lib/actions/work-templates";
import WorkItemsClient from "./_components/work-items-client";

type Props = { params: Promise<{ orgSlug: string }> };

export default async function WorkItemsPage({ params }: Props) {
    const { orgSlug } = await params;
    const { templates, callerRole } = await getWorkTemplates(orgSlug);

    return (
        <WorkItemsClient
            orgSlug={orgSlug}
            templates={templates}
            callerRole={callerRole}
        />
    );
}
