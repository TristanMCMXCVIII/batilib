import { redirect } from "next/navigation";
import { getOrgWithRole } from "@/lib/actions/organization-settings";
import OrgTabsNav from "./_components/org-tabs-nav";

type Props = {
    children: React.ReactNode;
    params: Promise<{ orgId: string }>;
};

export default async function OrganizationLayout({ children, params }: Props) {
    const { orgId } = await params;
    const data = await getOrgWithRole(orgId);
    if (!data) redirect("/onboarding?context=kicked");

    const tabs = [
        { label: "Présentation", href: `/app/${orgId}/my-organization/presentation` },
        { label: "Membres", href: `/app/${orgId}/my-organization/members` },
        ...(data.org.kind === "BUILDING_COMPANY"
            ? [{ label: "Facturation", href: `/app/${orgId}/my-organization/billing` }]
            : []),
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-border px-4 sm:px-10 lg:px-20 pt-8 pb-0">
                <h1 className="page-title">{data.org.name}</h1>
                <p className="mt-1 caption mb-5">Paramètres de l&apos;organisation</p>
                <OrgTabsNav tabs={tabs} />
            </div>
            <div className="flex-1 overflow-auto px-4 sm:px-10 lg:px-20">
                {children}
            </div>
        </div>
    );
}
