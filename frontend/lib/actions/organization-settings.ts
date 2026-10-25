"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { r2, R2_BUCKET } from "@/lib/r2";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { OrgKind } from "./organization";
import { slugify } from "@/lib/slug";
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

async function generateUniqueOrgSlug(name: string, excludeSlug: string): Promise<string> {
    const base = slugify(name) || "organisation";
    let slug = base;
    let counter = 2;
    while (true) {
        const existing = await db.query<{ id: string }>(
            `SELECT id FROM "Organization" WHERE slug = $1 AND slug != $2 LIMIT 1`,
            [slug, excludeSlug],
        );
        if (!existing.rows.length) return slug;
        slug = `${base}-${counter++}`;
    }
}

async function getCallerRole(orgSlug: string, userId: string): Promise<OrgRole | null> {
    const result = await db.query<{ role: OrgRole }>(
        `SELECT om.role FROM "OrganizationMembership" om
         JOIN "Organization" o ON o.id = om."organizationId"
         WHERE o.slug = $1 AND om."userId" = $2 AND om.status = 'ACTIVE'
         LIMIT 1`,
        [orgSlug, userId],
    );
    return result.rows[0]?.role ?? null;
}

// ─── Queries ──────────────────────────────────────────────

export async function getOrgWithRole(
    orgSlug: string,
): Promise<{ org: OrgData; role: OrgRole } | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    const result = await db.query<OrgData & { role: OrgRole }>(
        `SELECT o.id, o.kind, o.name, o.description, o.siret, o."logoUrl", m.role
         FROM "Organization" o
         JOIN "OrganizationMembership" m ON m."organizationId" = o.id
         WHERE o.slug = $1 AND m."userId" = $2 AND m.status = 'ACTIVE'
         LIMIT 1`,
        [orgSlug, session.user.id],
    );

    if (!result.rows.length) return null;
    const { role, ...org } = result.rows[0];
    return { org, role };
}

export async function getOrgMembers(orgSlug: string): Promise<OrgMember[]> {
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
         WHERE m."organizationId" = (SELECT id FROM "Organization" WHERE slug = $1)
           AND m.status = 'ACTIVE'
         ORDER BY
           CASE m.role WHEN 'FOUNDER' THEN 0 WHEN 'MANAGER' THEN 1 ELSE 2 END,
           u.name ASC`,
        [orgSlug],
    );
    return result.rows;
}

// ─── Mutations ────────────────────────────────────────────

export async function updateOrganization(
    orgSlug: string,
    data: Partial<Pick<OrgData, "name" | "description" | "kind" | "siret" | "logoUrl">>,
): Promise<{ error?: string; newSlug?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER") return { error: "Action réservée au fondateur" };

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    let newSlug: string | undefined;

    if (data.name !== undefined) {
        const trimmedName = data.name.trim();
        fields.push(`name = $${i++}`);
        values.push(trimmedName);
        newSlug = await generateUniqueOrgSlug(trimmedName, orgSlug);
        fields.push(`slug = $${i++}`);
        values.push(newSlug);
    }
    if (data.description !== undefined) { fields.push(`description = $${i++}`); values.push(data.description || null); }
    if (data.kind !== undefined) { fields.push(`kind = $${i++}`); values.push(data.kind); }
    if (data.siret !== undefined) { fields.push(`siret = $${i++}`); values.push(data.siret?.trim() || null); }
    if (data.logoUrl !== undefined) {
        // Supprimer l'ancien logo R2 si existant
        const oldResult = await db.query<{ logoUrl: string | null }>(
            `SELECT "logoUrl" FROM "Organization" WHERE slug = $1 LIMIT 1`,
            [orgSlug],
        );
        const oldLogoUrl = oldResult.rows[0]?.logoUrl;
        if (oldLogoUrl?.startsWith("/api/files/")) {
            const oldKey = oldLogoUrl.slice("/api/files/".length);
            await r2
                .send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }))
                .catch(() => {});
        }
        fields.push(`"logoUrl" = $${i++}`);
        values.push(data.logoUrl || null);
    }

    if (!fields.length) return {};

    fields.push(`"updatedAt" = NOW()`);
    values.push(orgSlug);

    await db.query(
        `UPDATE "Organization" SET ${fields.join(", ")} WHERE slug = $${i}`,
        values,
    );

    revalidatePath(`/${newSlug ?? orgSlug}/my-organization/presentation`);
    return { newSlug };
}

export async function updateMemberRole(
    orgSlug: string,
    membershipId: string,
    newRole: "MANAGER" | "MEMBER",
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER") return { error: "Action réservée au fondateur" };

    const target = await db.query<{ role: OrgRole; userId: string }>(
        `SELECT om.role, om."userId" FROM "OrganizationMembership" om
         WHERE om.id = $1
           AND om."organizationId" = (SELECT id FROM "Organization" WHERE slug = $2)`,
        [membershipId, orgSlug],
    );
    if (!target.rows.length) return { error: "Membre introuvable" };
    if (target.rows[0].role === "FOUNDER") return { error: "Utilisez le transfert de rôle fondateur" };

    await db.query(
        `UPDATE "OrganizationMembership" SET role = $1, "updatedAt" = NOW() WHERE id = $2`,
        [newRole, membershipId],
    );

    revalidatePath(`/${orgSlug}/my-organization/members`);
    return {};
}

export async function removeMember(
    orgSlug: string,
    membershipId: string,
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER") return { error: "Action réservée au fondateur" };

    const target = await db.query<{ role: OrgRole }>(
        `SELECT om.role FROM "OrganizationMembership" om
         WHERE om.id = $1
           AND om."organizationId" = (SELECT id FROM "Organization" WHERE slug = $2)`,
        [membershipId, orgSlug],
    );
    if (!target.rows.length) return { error: "Membre introuvable" };
    if (target.rows[0].role === "FOUNDER") return { error: "Le fondateur ne peut pas être retiré" };

    await db.query(
        `DELETE FROM "OrganizationMembership" WHERE id = $1`,
        [membershipId],
    );

    revalidatePath(`/${orgSlug}/my-organization/members`);
    return {};
}

export async function transferFounder(
    orgSlug: string,
    targetMembershipId: string,
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const callerMembership = await db.query<{ id: string; role: OrgRole }>(
        `SELECT om.id, om.role FROM "OrganizationMembership" om
         JOIN "Organization" o ON o.id = om."organizationId"
         WHERE o.slug = $1 AND om."userId" = $2 AND om.status = 'ACTIVE'
         LIMIT 1`,
        [orgSlug, session.user.id],
    );
    if (callerMembership.rows[0]?.role !== "FOUNDER") return { error: "Action réservée au fondateur" };

    const target = await db.query<{ role: OrgRole }>(
        `SELECT om.role FROM "OrganizationMembership" om
         WHERE om.id = $1
           AND om."organizationId" = (SELECT id FROM "Organization" WHERE slug = $2)`,
        [targetMembershipId, orgSlug],
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

    revalidatePath(`/${orgSlug}/my-organization/members`);
    return {};
}

export async function inviteMember(
    orgSlug: string,
    email: string,
    role: "MANAGER" | "MEMBER",
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const callerRole = await getCallerRole(orgSlug, session.user.id);
    if (callerRole !== "FOUNDER") return { error: "Action réservée au fondateur" };

    const orgResult = await db.query<{ id: string }>(
        `SELECT id FROM "Organization" WHERE slug = $1 LIMIT 1`,
        [orgSlug],
    );
    if (!orgResult.rows.length) return { error: "Organisation introuvable" };
    const orgId = orgResult.rows[0].id;

    const existing = await db.query(
        `SELECT m.id FROM "OrganizationMembership" m
         JOIN "User" u ON u.id = m."userId"
         WHERE m."organizationId" = $1 AND u.email = $2 AND m.status = 'ACTIVE'`,
        [orgId, email.toLowerCase().trim()],
    );
    if (existing.rows.length) return { error: "Cette personne est déjà membre" };

    const pending = await db.query(
        `SELECT id FROM "OrganizationInvitation"
         WHERE "organizationId" = $1 AND email = $2 AND "expiresAt" > NOW()`,
        [orgId, email.toLowerCase().trim()],
    );
    if (pending.rows.length) return { error: "Une invitation est déjà en attente pour cet email" };

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = crypto.randomUUID();

    await db.query(
        `INSERT INTO "OrganizationInvitation" (id, "organizationId", email, role, token, "expiresAt", "invitedById", "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW())`,
        [orgId, email.toLowerCase().trim(), role, token, expiresAt, session.user.id],
    );

    // TODO: envoyer l'email d'invitation avec le token

    revalidatePath(`/${orgSlug}/my-organization/members`);
    return {};
}
