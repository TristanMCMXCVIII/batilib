import { redirect } from "next/navigation";

type Props = { params: Promise<{ orgId: string }> };

export default async function OrganizationIndexPage({ params }: Props) {
    const { orgId } = await params;
    redirect(`/app/${orgId}/my-organization/presentation`);
}
