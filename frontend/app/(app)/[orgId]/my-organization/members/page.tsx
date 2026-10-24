import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getOrgWithRole, getOrgMembers } from "@/lib/actions/organization-settings";
import MembersClient from "../_components/members-client";

type Props = { params: Promise<{ orgId: string }> };

export default async function MembersPage({ params }: Props) {
    const { orgId } = await params;

    const [session, data, members] = await Promise.all([
        auth.api.getSession({ headers: await headers() }),
        getOrgWithRole(orgId),
        getOrgMembers(orgId),
    ]);

    if (!data) redirect("/onboarding?context=kicked");

    return (
        <MembersClient
            members={members}
            orgId={orgId}
            isFounder={data.role === "FOUNDER"}
            currentUserId={session!.user.id}
        />
    );
}
