import { getOrgProjects } from "@/lib/actions/projects";
import ProjectsClient from "./_components/projects-client";

type Props = {
    params: Promise<{ orgId: string }>;
};

export default async function ProjectsPage({ params }: Props) {
    const { orgId } = await params;
    const projects = await getOrgProjects(orgId);

    return <ProjectsClient projects={projects} orgId={orgId} />;
}
