"use server";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────

export type ProjectInvitationPreview = {
    token: string;
    projectName: string;
    leadOrgName: string;
    inviterName: string;
    invitedEmail: string;
    projectSlug: string;
    leadOrgSlug: string;
};

export type UserOrgForJoin = {
    id: string;
    slug: string;
    name: string;
    kind: string;
    membershipRole: "FOUNDER" | "MANAGER" | "MEMBER";
};

// ─── Queries ──────────────────────────────────────────────

export async function getProjectInvitationPreview(
    token: string,
): Promise<ProjectInvitationPreview | null> {
    const result = await db.query<{
        token: string;
        projectName: string;
        projectSlug: string;
        leadOrgName: string;
        leadOrgSlug: string;
        inviterName: string;
        invitedEmail: string;
    }>(
        `SELECT
           pi.token,
           p.name           AS "projectName",
           p.slug           AS "projectSlug",
           o.name           AS "leadOrgName",
           o.slug           AS "leadOrgSlug",
           u.name           AS "inviterName",
           pi."invitedEmail"
         FROM "ProjectInvitation" pi
         JOIN "Project" p ON p.id = pi."projectId"
         JOIN "Organization" o ON o.id = p."leadOrganizationId"
         JOIN "User" u ON u.id = pi."invitedById"
         WHERE pi.token = $1 AND pi."expiresAt" > NOW()
         LIMIT 1`,
        [token],
    );
    return result.rows[0] ?? null;
}

export async function getUserOrgsForProjectJoin(userId: string): Promise<UserOrgForJoin[]> {
    const result = await db.query<UserOrgForJoin>(
        `SELECT
           o.id, o.slug, o.name, o.kind,
           om.role AS "membershipRole"
         FROM "OrganizationMembership" om
         JOIN "Organization" o ON o.id = om."organizationId"
         WHERE om."userId" = $1 AND om.status = 'ACTIVE'
         ORDER BY
           CASE om.role WHEN 'FOUNDER' THEN 1 WHEN 'MANAGER' THEN 2 ELSE 3 END,
           o.name ASC`,
        [userId],
    );
    return result.rows;
}

// ─── Mutations ────────────────────────────────────────────

export async function acceptProjectInvitation(
    token: string,
    orgId: string,
): Promise<{ error?: string; clientOrgSlug?: string; projectSlug?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const invResult = await db.query<{
        id: string;
        projectId: string;
        projectSlug: string;
        invitedEmail: string;
    }>(
        `SELECT pi.id, pi."projectId", p.slug AS "projectSlug", pi."invitedEmail"
         FROM "ProjectInvitation" pi
         JOIN "Project" p ON p.id = pi."projectId"
         WHERE pi.token = $1 AND pi."expiresAt" > NOW()
         LIMIT 1`,
        [token],
    );
    if (!invResult.rows.length) return { error: "Invitation introuvable ou expirée" };
    const inv = invResult.rows[0];

    if (inv.invitedEmail.toLowerCase() !== session.user.email.toLowerCase()) {
        return { error: "Cette invitation a été envoyée à une autre adresse email" };
    }

    const membershipResult = await db.query<{ id: string; role: string }>(
        `SELECT id, role FROM "OrganizationMembership"
         WHERE "organizationId" = $1 AND "userId" = $2 AND status = 'ACTIVE'
         LIMIT 1`,
        [orgId, session.user.id],
    );
    const membership = membershipResult.rows[0];
    if (!membership) return { error: "Vous n'êtes pas membre de cette organisation" };
    if (membership.role === "MEMBER") {
        return { error: "Seul un Fondateur ou Manager peut engager une organisation sur un projet" };
    }

    const existingClient = await db.query(
        `SELECT id FROM "ProjectParticipant" WHERE "projectId" = $1 AND role = 'CLIENT' LIMIT 1`,
        [inv.projectId],
    );
    if (existingClient.rows.length) return { error: "Ce projet a déjà un client assigné" };

    const orgResult = await db.query<{ slug: string }>(
        `SELECT slug FROM "Organization" WHERE id = $1 LIMIT 1`,
        [orgId],
    );
    const clientOrgSlug = orgResult.rows[0]?.slug;
    if (!clientOrgSlug) return { error: "Organisation introuvable" };

    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const ppResult = await client.query<{ id: string }>(
            `INSERT INTO "ProjectParticipant"
               (id, "projectId", "organizationId", role, "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, 'CLIENT', NOW(), NOW())
             RETURNING id`,
            [inv.projectId, orgId],
        );
        const participantId = ppResult.rows[0].id;

        await client.query(
            `INSERT INTO "ProjectParticipantMember"
               (id, "projectParticipantId", "organizationMembershipId", "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW())`,
            [participantId, membership.id],
        );

        await client.query(`DELETE FROM "ProjectInvitation" WHERE id = $1`, [inv.id]);

        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }

    return { clientOrgSlug, projectSlug: inv.projectSlug };
}

export async function declineProjectInvitation(token: string): Promise<void> {
    const session = await getSession();
    if (!session) return;
    await db.query(`DELETE FROM "ProjectInvitation" WHERE token = $1`, [token]);
}
