"use server";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

export type ProjectParticipantRole = "LEAD" | "CLIENT" | "SUBCONTRACTOR";

export type ProjectAccess = {
    projectId: string;
    projectName: string;
    projectSlug: string;
    callerParticipantRole: ProjectParticipantRole;
    callerOrgRole: string;
};

export async function resolveProjectAccess(
    orgSlug: string,
    projectSlug: string,
): Promise<ProjectAccess | null> {
    const session = await getSession();
    if (!session) return null;

    const result = await db.query<{
        projectId: string;
        projectName: string;
        projectSlug: string;
        participantRole: ProjectParticipantRole;
        orgRole: string;
    }>(
        `SELECT p.id         AS "projectId",
                p.name       AS "projectName",
                p.slug       AS "projectSlug",
                pp.role      AS "participantRole",
                om.role      AS "orgRole"
         FROM "Project" p
         JOIN "ProjectParticipant"    pp ON pp."projectId"      = p.id
         JOIN "Organization"          o  ON o.id                = pp."organizationId"
         JOIN "OrganizationMembership" om ON om."organizationId" = o.id
                                        AND om."userId"         = $3
                                        AND om.status           = 'ACTIVE'
         WHERE p.slug = $1 AND o.slug = $2
         LIMIT 1`,
        [projectSlug, orgSlug, session.user.id],
    );

    if (!result.rows.length) return null;
    const r = result.rows[0];
    return {
        projectId: r.projectId,
        projectName: r.projectName,
        projectSlug: r.projectSlug,
        callerParticipantRole: r.participantRole,
        callerOrgRole: r.orgRole,
    };
}

export type ProjectListItem = {
    id: string;
    slug: string;
    name: string;
    participantRole: ProjectParticipantRole;
    createdAt: string;
};

async function getMembershipId(orgSlug: string, userId: string): Promise<string | null> {
    const result = await db.query<{ id: string }>(
        `SELECT om.id FROM "OrganizationMembership" om
         JOIN "Organization" o ON o.id = om."organizationId"
         WHERE o.slug = $1 AND om."userId" = $2 AND om.status = 'ACTIVE'
         LIMIT 1`,
        [orgSlug, userId],
    );
    return result.rows[0]?.id ?? null;
}

async function getOrgIdFromSlug(orgSlug: string): Promise<string | null> {
    const result = await db.query<{ id: string }>(
        `SELECT id FROM "Organization" WHERE slug = $1 LIMIT 1`,
        [orgSlug],
    );
    return result.rows[0]?.id ?? null;
}

async function generateUniqueProjectSlug(orgId: string, name: string): Promise<string> {
    const base = slugify(name) || "projet";
    let slug = base;
    let counter = 2;
    while (true) {
        const existing = await db.query(
            `SELECT id FROM "Project" WHERE "leadOrganizationId" = $1 AND slug = $2 LIMIT 1`,
            [orgId, slug],
        );
        if (!existing.rows.length) return slug;
        slug = `${base}-${counter++}`;
    }
}

export async function getOrgProjects(orgSlug: string): Promise<ProjectListItem[]> {
    const session = await getSession();
    if (!session) return [];

    const membershipId = await getMembershipId(orgSlug, session.user.id);
    if (!membershipId) return [];

    const result = await db.query<{
        id: string;
        slug: string;
        name: string;
        role: ProjectParticipantRole;
        createdAt: Date;
    }>(
        `SELECT p.id, p.slug, p.name, pp.role, p."createdAt"
         FROM "Project" p
         JOIN "ProjectParticipant" pp ON pp."projectId" = p.id
         WHERE pp."organizationId" = (SELECT id FROM "Organization" WHERE slug = $1)
         ORDER BY p."createdAt" DESC`,
        [orgSlug],
    );

    return result.rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        participantRole: row.role,
        createdAt: row.createdAt.toISOString(),
    }));
}

export type ProjectDetail = {
    id: string;
    slug: string;
    name: string;
    participantRole: ProjectParticipantRole;
    createdAt: string;
};

export async function getProjectForOrg(
    orgSlug: string,
    projectSlug: string,
): Promise<ProjectDetail | null> {
    const session = await getSession();
    if (!session) return null;

    const membershipId = await getMembershipId(orgSlug, session.user.id);
    if (!membershipId) return null;

    const result = await db.query<{
        id: string;
        slug: string;
        name: string;
        role: ProjectParticipantRole;
        createdAt: Date;
    }>(
        `SELECT p.id, p.slug, p.name, pp.role, p."createdAt"
         FROM "Project" p
         JOIN "ProjectParticipant" pp ON pp."projectId" = p.id
         WHERE p.slug = $1
           AND pp."organizationId" = (SELECT id FROM "Organization" WHERE slug = $2)
         LIMIT 1`,
        [projectSlug, orgSlug],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        participantRole: row.role,
        createdAt: row.createdAt.toISOString(),
    };
}

export async function createProject(
    orgSlug: string,
    name: string,
): Promise<{ projectSlug: string } | { error: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const trimmedName = name.trim();
    if (!trimmedName) return { error: "Le nom du projet est requis." };

    const membershipId = await getMembershipId(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé." };

    const orgId = await getOrgIdFromSlug(orgSlug);
    if (!orgId) return { error: "Organisation introuvable." };

    const slug = await generateUniqueProjectSlug(orgId, trimmedName);

    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const projectResult = await client.query<{ id: string }>(
            `INSERT INTO "Project" (id, "leadOrganizationId", slug, name, "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW())
             RETURNING id`,
            [orgId, slug, trimmedName],
        );
        const projectId = projectResult.rows[0].id;

        await client.query(
            `INSERT INTO "ProjectParticipant" (id, "projectId", "organizationId", role, "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, 'LEAD', NOW(), NOW())`,
            [projectId, orgId],
        );

        await client.query("COMMIT");
        return { projectSlug: slug };
    } catch {
        await client.query("ROLLBACK");
        return { error: "Erreur lors de la création du projet." };
    } finally {
        client.release();
    }
}
