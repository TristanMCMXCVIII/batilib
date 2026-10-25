import { redirect } from "next/navigation";
import { getProjectForOrg } from "@/lib/actions/projects";
import { SetActiveProject } from "@/lib/context/active-project";

type Props = {
    children: React.ReactNode;
    params: Promise<{ orgSlug: string; projectSlug: string }>;
};

export default async function ProjectLayout({ children, params }: Props) {
    const { orgSlug, projectSlug } = await params;
    const project = await getProjectForOrg(orgSlug, projectSlug);
    if (!project) redirect(`/${orgSlug}/projects`);

    return (
        <>
            <SetActiveProject id={project.id} slug={project.slug} name={project.name} />
            {children}
        </>
    );
}
