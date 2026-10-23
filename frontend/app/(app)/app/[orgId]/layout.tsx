import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type Props = {
    children: React.ReactNode;
    params: Promise<{ orgId: string }>;
};

export default async function OrgLayout({ children, params }: Props) {
    const { orgId } = await params;
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) redirect("/login");

    const result = await db.query<{ id: string }>(
        `SELECT id FROM "OrganizationMembership"
         WHERE "organizationId" = $1 AND "userId" = $2 AND status = 'ACTIVE'
         LIMIT 1`,
        [orgId, session.user.id],
    );

    if (!result.rows.length) redirect("/onboarding?context=kicked");

    return <>{children}</>;
}
