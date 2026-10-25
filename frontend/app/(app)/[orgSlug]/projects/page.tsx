import { getOrgProjects } from "@/lib/actions/projects";
import ProjectsClient from "./_components/projects-client";

type Props = {
    params: Promise<{ orgSlug: string }>;
};

export default async function ProjectsPage({ params }: Props) {
    const { orgSlug } = await params;
    const projects = await getOrgProjects(orgSlug);

    return <ProjectsClient projects={projects} orgSlug={orgSlug} />;
}
