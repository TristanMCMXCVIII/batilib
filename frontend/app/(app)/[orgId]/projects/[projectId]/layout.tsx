import { redirect } from "next/navigation";
import { getProjectForOrg } from "@/lib/actions/projects";
import ProjectTabsNav from "./_components/project-tabs-nav";

type Props = {
    children: React.ReactNode;
    params: Promise<{ orgId: string; projectId: string }>;
};

export default async function ProjectLayout({ children, params }: Props) {
    const { orgId, projectId } = await params;
    const project = await getProjectForOrg(orgId, projectId);
    if (!project) redirect(`/${orgId}/projects`);

    const base = `/${orgId}/projects/${projectId}`;
    const tabs = [
        { label: "Accueil", href: base, exact: true },
        { label: "Éditeurs", href: `${base}/editors` },
        { label: "Membres", href: `${base}/members` },
        { label: "Documents", href: `${base}/documents` },
        { label: "Économie", href: `${base}/economics` },
    ];

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-border page-outer pt-8 pb-0">
                <h1 className="page-title">{project.name}</h1>
                <div className="mt-3">
                    <ProjectTabsNav tabs={tabs} />
                </div>
            </div>
            <div className="flex-1 overflow-auto page-outer">
                {children}
            </div>
        </div>
    );
}
