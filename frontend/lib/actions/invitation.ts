"use server";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export type InvitationPreview = {
    token: string;
    orgName: string;
    orgSlug: string;
    role: "MANAGER" | "MEMBER";
    inviterName: string;
    email: string;
};

export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
    const result = await db.query<InvitationPreview>(
        `SELECT
           i.token,
           o.name    AS "orgName",
           o.slug    AS "orgSlug",
           i.role,
           u.name    AS "inviterName",
           i.email
         FROM "OrganizationInvitation" i
         JOIN "Organization" o ON o.id = i."organizationId"
         JOIN "User" u ON u.id = i."invitedById"
         WHERE i.token = $1 AND i."expiresAt" > NOW()
         LIMIT 1`,
        [token],
    );
    return result.rows[0] ?? null;
}

export async function acceptInvitation(token: string): Promise<{ error?: string; orgSlug?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const result = await db.query<{
        id: string;
        orgId: string;
        orgSlug: string;
        role: "MANAGER" | "MEMBER";
        email: string;
    }>(
        `SELECT i.id, o.id AS "orgId", o.slug AS "orgSlug", i.role, i.email
         FROM "OrganizationInvitation" i
         JOIN "Organization" o ON o.id = i."organizationId"
         WHERE i.token = $1 AND i."expiresAt" > NOW()
         LIMIT 1`,
        [token],
    );

    if (!result.rows.length) return { error: "Invitation introuvable ou expirée" };
    const inv = result.rows[0];

    if (inv.email.toLowerCase() !== session.user.email.toLowerCase()) {
        return { error: "Cette invitation a été envoyée à une autre adresse email" };
    }

    // Already a member — clean up and redirect
    const existing = await db.query(
        `SELECT id FROM "OrganizationMembership" WHERE "organizationId" = $1 AND "userId" = $2`,
        [inv.orgId, session.user.id],
    );
    if (existing.rows.length) {
        await db.query(`DELETE FROM "OrganizationInvitation" WHERE id = $1`, [inv.id]);
        return { orgSlug: inv.orgSlug };
    }

    const client = await db.connect();
    try {
        await client.query("BEGIN");
        await client.query(
            `INSERT INTO "OrganizationMembership" (id, "organizationId", "userId", role, status, "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, $3, 'ACTIVE', NOW(), NOW())`,
            [inv.orgId, session.user.id, inv.role],
        );
        await client.query(`DELETE FROM "OrganizationInvitation" WHERE id = $1`, [inv.id]);
        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }

    return { orgSlug: inv.orgSlug };
}

export async function declineInvitation(token: string): Promise<void> {
    const session = await getSession();
    if (!session) return;
    await db.query(`DELETE FROM "OrganizationInvitation" WHERE token = $1`, [token]);
}
