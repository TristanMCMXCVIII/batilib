import { redirect } from "next/navigation";
import { getOrgWithRole } from "@/lib/actions/organization-settings";
import OrgTabsNav from "./_components/org-tabs-nav";

type Props = {
    children: React.ReactNode;
    params: Promise<{ orgSlug: string }>;
};

export default async function OrganizationLayout({ children, params }: Props) {
    const { orgSlug } = await params;
    const data = await getOrgWithRole(orgSlug);
    if (!data) redirect("/onboarding?context=kicked");

    const tabs = [
        { label: "Présentation", href: `/${orgSlug}/my-organization/presentation` },
        { label: "Membres", href: `/${orgSlug}/my-organization/members` },
        ...(data.org.kind === "BUILDING_COMPANY"
            ? [{ label: "Facturation", href: `/${orgSlug}/my-organization/billing` }]
            : []),
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-border page-outer pt-8 pb-0">
                <h1 className="page-title">{data.org.name}</h1>
                <div className="mt-3">
                    <OrgTabsNav tabs={tabs} />
                </div>
            </div>
            <div className="flex-1 overflow-auto page-outer">
                {children}
            </div>
        </div>
    );
}
