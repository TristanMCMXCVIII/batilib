import { getLibraryTree } from "@/lib/actions/work-item-templates";
import WorkItemsClient from "./_components/work-items-client";

type Props = { params: Promise<{ orgSlug: string }> };

export default async function WorkItemsPage({ params }: Props) {
    const { orgSlug } = await params;
    const { tree, callerRole, workPackageTemplates } = await getLibraryTree(orgSlug);

    return (
        <WorkItemsClient
            orgSlug={orgSlug}
            tree={tree}
            callerRole={callerRole}
            workPackageTemplates={workPackageTemplates}
        />
    );
}
