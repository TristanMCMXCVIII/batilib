import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getOrgWithRole, getOrgMembers, getOrgInvitations } from "@/lib/actions/organization-settings";
import MembersClient from "../_components/members-client";

type Props = { params: Promise<{ orgSlug: string }> };

export default async function MembersPage({ params }: Props) {
    const { orgSlug } = await params;

    const [session, data, members, invitations] = await Promise.all([
        auth.api.getSession({ headers: await headers() }),
        getOrgWithRole(orgSlug),
        getOrgMembers(orgSlug),
        getOrgInvitations(orgSlug),
    ]);

    if (!data) redirect("/onboarding?context=kicked");

    return (
        <MembersClient
            members={members}
            invitations={invitations}
            orgSlug={orgSlug}
            isFounder={data.role === "FOUNDER"}
            currentUserId={session!.user.id}
        />
    );
}
