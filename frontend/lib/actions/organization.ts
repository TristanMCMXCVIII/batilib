"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export type OrgKind = "BUILDING_COMPANY" | "CLIENT_COMPANY" | "INDIVIDUAL_CLIENT";

export async function createOrganization(input: {
    kind: OrgKind;
    name: string;
    siret?: string;
}): Promise<{ orgId: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new Error("Non authentifié");

    const { kind, name, siret } = input;
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const orgResult = await client.query<{ id: string }>(
            `INSERT INTO "Organization" (id, kind, name, siret, "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW())
             RETURNING id`,
            [kind, name.trim(), siret?.trim() || null],
        );
        const orgId = orgResult.rows[0].id;

        await client.query(
            `INSERT INTO "OrganizationMembership" (id, "organizationId", "userId", role, status, "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, 'FOUNDER', 'ACTIVE', NOW(), NOW())`,
            [orgId, session.user.id],
        );

        await client.query("COMMIT");
        return { orgId };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

export async function getUserPrimaryOrgId(): Promise<string | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    const result = await db.query<{ organizationId: string }>(
        `SELECT "organizationId" FROM "OrganizationMembership"
         WHERE "userId" = $1 AND status = 'ACTIVE'
         ORDER BY "createdAt" ASC
         LIMIT 1`,
        [session.user.id],
    );

    return result.rows[0]?.organizationId ?? null;
}

export type OrgInfo = {
    orgId: string;
    orgName: string;
    orgKind: string;
};

export type PrimaryOrg = OrgInfo | null;

export async function getUserPrimaryOrg(): Promise<PrimaryOrg> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    const result = await db.query<{ organizationId: string; name: string; kind: string }>(
        `SELECT m."organizationId", o.name, o.kind
         FROM "OrganizationMembership" m
         JOIN "Organization" o ON o.id = m."organizationId"
         WHERE m."userId" = $1 AND m.status = 'ACTIVE'
         ORDER BY m."createdAt" ASC
         LIMIT 1`,
        [session.user.id],
    );

    const row = result.rows[0];
    if (!row) return null;
    return { orgId: row.organizationId, orgName: row.name, orgKind: row.kind };
}

export async function getUserOrgs(): Promise<OrgInfo[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return [];

    const result = await db.query<{ organizationId: string; name: string; kind: string }>(
        `SELECT m."organizationId", o.name, o.kind
         FROM "OrganizationMembership" m
         JOIN "Organization" o ON o.id = m."organizationId"
         WHERE m."userId" = $1 AND m.status = 'ACTIVE'
         ORDER BY m."createdAt" ASC`,
        [session.user.id],
    );

    return result.rows.map((row) => ({
        orgId: row.organizationId,
        orgName: row.name,
        orgKind: row.kind,
    }));
}
