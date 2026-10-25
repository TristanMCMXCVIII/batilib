import { getWorkPackageTemplates } from "@/lib/actions/work-package-templates";
import WorkPackagesClient from "./_components/work-packages-client";

type Props = { params: Promise<{ orgSlug: string }> };

export default async function WorkPackagesPage({ params }: Props) {
    const { orgSlug } = await params;
    const { templates, tradeCategories, callerRole } = await getWorkPackageTemplates(orgSlug);

    return (
        <WorkPackagesClient
            orgSlug={orgSlug}
            templates={templates}
            tradeCategories={tradeCategories}
            callerRole={callerRole}
        />
    );
}
