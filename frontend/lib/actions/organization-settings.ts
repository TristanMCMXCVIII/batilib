"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { OrgKind } from "./organization";
export type { OrgKind };

// ─── Types ────────────────────────────────────────────────

export type OrgRole = "FOUNDER" | "MANAGER" | "MEMBER";
export type MembershipStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export type OrgData = {
    id: string;
    kind: OrgKind;
    name: string;
    description: string | null;
    siret: string | null;
    logoUrl: string | null;
};

export type OrgMember = {
    membershipId: string;
    role: OrgRole;
    userId: string;
    name: string;
    email: string;
    image: string | null;
};

// ─── Helpers ──────────────────────────────────────────────

async function getCallerRole(orgId: string, userId: string): Promise<OrgRole | null> {
    const result = await db.query<{ role: OrgRole }>(
        `SELECT role FROM "OrganizationMembership"
         WHERE "organizationId" = $1 AND "userId" = $2 AND status = 'ACTIVE'
         LIMIT 1`,
        [orgId, userId],
    );
    return result.rows[0]?.role ?? null;
}

// ─── Queries ──────────────────────────────────────────────

export async function getOrgWithRole(
    orgId: string,
): Promise<{ org: OrgData; role: OrgRole } | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    const result = await db.query<OrgData & { role: OrgRole }>(
        `SELECT o.id, o.kind, o.name, o.description, o.siret, o."logoUrl", m.role
         FROM "Organization" o
         JOIN "OrganizationMembership" m ON m."organizationId" = o.id
         WHERE o.id = $1 AND m."userId" = $2 AND m.status = 'ACTIVE'
         LIMIT 1`,
        [orgId, session.user.id],
    );

    if (!result.rows.length) return null;
    const { role, ...org } = result.rows[0];
    return { org, role };
}

export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
    const result = await db.query<OrgMember>(
        `SELECT
           m.id        AS "membershipId",
           m.role,
           u.id        AS "userId",
           u.name,
           u.email,
           u.image
         FROM "OrganizationMembership" m
         JOIN "User" u ON u.id = m."userId"
         WHERE m."organizationId" = $1 AND m.status = 'ACTIVE'
         ORDER BY
           CASE m.role WHEN 'FOUNDER' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END,
           u.name ASC`,
        [orgId],
    );
    return result.rows;
}

// ─── Mutations ────────────────────────────────────────────

export async function updateOrganization(
    orgId: string,
    data: Partial<Pick<OrgData, "name" | "description" | "kind" | "siret">>,
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgId, session.user.id);
    if (role !== "FOUNDER") return { error: "Action réservée au fondateur" };

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (data.name !== undefined) { fields.push(`name = $${i++}`); values.push(data.name.trim()); }
    if (data.description !== undefined) { fields.push(`description = $${i++}`); values.push(data.description || null); }
    if (data.kind !== undefined) { fields.push(`kind = $${i++}`); values.push(data.kind); }
    if (data.siret !== undefined) { fields.push(`siret = $${i++}`); values.push(data.siret?.trim() || null); }

    if (!fields.length) return {};

    fields.push(`"updatedAt" = NOW()`);
    values.push(orgId);

    await db.query(
        `UPDATE "Organization" SET ${fields.join(", ")} WHERE id = $${i}`,
        values,
    );

    revalidatePath(`/app/${orgId}/organization/presentation`);
    return {};
}

export async function updateMemberRole(
    orgId: string,
    membershipId: string,
    newRole: "MANAGER" | "MEMBER",
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgId, session.user.id);
    if (role !== "FOUNDER") return { error: "Action réservée au fondateur" };

    // Cannot downgrade the FOUNDER's own membership via this action
    const target = await db.query<{ role: OrgRole; userId: string }>(
        `SELECT role, "userId" FROM "OrganizationMembership" WHERE id = $1 AND "organizationId" = $2`,
        [membershipId, orgId],
    );
    if (!target.rows.length) return { error: "Membre introuvable" };
    if (target.rows[0].role === "FOUNDER") return { error: "Utilisez le transfert de rôle fondateur" };

    await db.query(
        `UPDATE "OrganizationMembership" SET role = $1, "updatedAt" = NOW() WHERE id = $2`,
        [newRole, membershipId],
    );

    revalidatePath(`/app/${orgId}/organization/members`);
    return {};
}

export async function removeMember(
    orgId: string,
    membershipId: string,
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgId, session.user.id);
    if (role !== "FOUNDER") return { error: "Action réservée au fondateur" };

    const target = await db.query<{ role: OrgRole }>(
        `SELECT role FROM "OrganizationMembership" WHERE id = $1 AND "organizationId" = $2`,
        [membershipId, orgId],
    );
    if (!target.rows.length) return { error: "Membre introuvable" };
    if (target.rows[0].role === "FOUNDER") return { error: "Le fondateur ne peut pas être retiré" };

    await db.query(
        `DELETE FROM "OrganizationMembership" WHERE id = $1`,
        [membershipId],
    );

    revalidatePath(`/app/${orgId}/organization/members`);
    return {};
}

export async function transferFounder(
    orgId: string,
    targetMembershipId: string,
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const callerMembership = await db.query<{ id: string; role: OrgRole }>(
        `SELECT id, role FROM "OrganizationMembership"
         WHERE "organizationId" = $1 AND "userId" = $2 AND status = 'ACTIVE'
         LIMIT 1`,
        [orgId, session.user.id],
    );
    if (callerMembership.rows[0]?.role !== "FOUNDER") return { error: "Action réservée au fondateur" };

    const target = await db.query<{ role: OrgRole }>(
        `SELECT role FROM "OrganizationMembership" WHERE id = $1 AND "organizationId" = $2`,
        [targetMembershipId, orgId],
    );
    if (!target.rows.length) return { error: "Membre introuvable" };

    const client = await db.connect();
    try {
        await client.query("BEGIN");
        await client.query(
            `UPDATE "OrganizationMembership" SET role = 'FOUNDER', "updatedAt" = NOW() WHERE id = $1`,
            [targetMembershipId],
        );
        await client.query(
            `UPDATE "OrganizationMembership" SET role = 'MANAGER', "updatedAt" = NOW() WHERE id = $1`,
            [callerMembership.rows[0].id],
        );
        await client.query("COMMIT");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }

    revalidatePath(`/app/${orgId}/organization/members`);
    return {};
}

export async function inviteMember(
    orgId: string,
    email: string,
    role: "MANAGER" | "MEMBER",
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const callerRole = await getCallerRole(orgId, session.user.id);
    if (callerRole !== "FOUNDER") return { error: "Action réservée au fondateur" };

    // Check not already a member
    const existing = await db.query(
        `SELECT m.id FROM "OrganizationMembership" m
         JOIN "User" u ON u.id = m."userId"
         WHERE m."organizationId" = $1 AND u.email = $2 AND m.status = 'ACTIVE'`,
        [orgId, email.toLowerCase().trim()],
    );
    if (existing.rows.length) return { error: "Cette personne est déjà membre" };

    // Check no pending invitation
    const pending = await db.query(
        `SELECT id FROM "OrganizationInvitation"
         WHERE "organizationId" = $1 AND email = $2 AND "expiresAt" > NOW()`,
        [orgId, email.toLowerCase().trim()],
    );
    if (pending.rows.length) return { error: "Une invitation est déjà en attente pour cet email" };

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const token = crypto.randomUUID();

    await db.query(
        `INSERT INTO "OrganizationInvitation" (id, "organizationId", email, role, token, "expiresAt", "invitedById", "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW())`,
        [orgId, email.toLowerCase().trim(), role, token, expiresAt, session.user.id],
    );

    // TODO: envoyer l'email d'invitation avec le token

    revalidatePath(`/app/${orgId}/organization/members`);
    return {};
}
