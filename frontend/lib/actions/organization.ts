"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { slugify } from "@/lib/slug";

export type OrgKind = "BUILDING_COMPANY" | "CLIENT_COMPANY" | "INDIVIDUAL_CLIENT";

async function generateUniqueOrgSlug(name: string): Promise<string> {
    const base = slugify(name) || "organisation";
    let slug = base;
    let counter = 2;
    while (true) {
        const existing = await db.query(
            `SELECT id FROM "Organization" WHERE slug = $1 LIMIT 1`,
            [slug],
        );
        if (!existing.rows.length) return slug;
        slug = `${base}-${counter++}`;
    }
}

export async function createOrganization(input: {
    kind: OrgKind;
    name: string;
    siret?: string;
}): Promise<{ orgId: string; orgSlug: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new Error("Non authentifié");

    const { kind, name, siret } = input;
    const slug = await generateUniqueOrgSlug(name.trim());
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const orgResult = await client.query<{ id: string }>(
            `INSERT INTO "Organization" (id, slug, kind, name, siret, "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW(), NOW())
             RETURNING id`,
            [slug, kind, name.trim(), siret?.trim() || null],
        );
        const orgId = orgResult.rows[0].id;

        await client.query(
            `INSERT INTO "OrganizationMembership" (id, "organizationId", "userId", role, status, "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, 'FOUNDER', 'ACTIVE', NOW(), NOW())`,
            [orgId, session.user.id],
        );

        await client.query("COMMIT");
        return { orgId, orgSlug: slug };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function getUserPrimaryOrgSlug(): Promise<string | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    const result = await db.query<{ slug: string }>(
        `SELECT o.slug
         FROM "OrganizationMembership" m
         JOIN "Organization" o ON o.id = m."organizationId"
         WHERE m."userId" = $1 AND m.status = 'ACTIVE'
         ORDER BY m."createdAt" ASC
         LIMIT 1`,
        [session.user.id],
    );

    return result.rows[0]?.slug ?? null;
}

export type OrgInfo = {
    orgId: string;
    orgSlug: string;
    orgName: string;
    orgKind: string;
    orgLogoUrl: string | null;
};

export type PrimaryOrg = OrgInfo | null;

export async function getUserPrimaryOrg(): Promise<PrimaryOrg> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    const result = await db.query<{ organizationId: string; slug: string; name: string; kind: string; logoUrl: string | null }>(
        `SELECT m."organizationId", o.slug, o.name, o.kind, o."logoUrl"
         FROM "OrganizationMembership" m
         JOIN "Organization" o ON o.id = m."organizationId"
         WHERE m."userId" = $1 AND m.status = 'ACTIVE'
         ORDER BY m."createdAt" ASC
         LIMIT 1`,
        [session.user.id],
    );

    const row = result.rows[0];
    if (!row) return null;
    return { orgId: row.organizationId, orgSlug: row.slug, orgName: row.name, orgKind: row.kind, orgLogoUrl: row.logoUrl };
}

export async function getUserOrgs(): Promise<OrgInfo[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return [];

    const result = await db.query<{ organizationId: string; slug: string; name: string; kind: string; logoUrl: string | null }>(
        `SELECT m."organizationId", o.slug, o.name, o.kind, o."logoUrl"
         FROM "OrganizationMembership" m
         JOIN "Organization" o ON o.id = m."organizationId"
         WHERE m."userId" = $1 AND m.status = 'ACTIVE'
         ORDER BY m."createdAt" ASC`,
        [session.user.id],
    );

    return result.rows.map((row) => ({
        orgId: row.organizationId,
        orgSlug: row.slug,
        orgName: row.name,
        orgKind: row.kind,
        orgLogoUrl: row.logoUrl,
    }));
}
