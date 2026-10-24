"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export type ProjectParticipantRole = "LEAD" | "CLIENT" | "SUBCONTRACTOR";

export type ProjectListItem = {
    id: string;
    name: string;
    participantRole: ProjectParticipantRole;
    createdAt: string;
};

async function getMembershipId(orgId: string, userId: string): Promise<string | null> {
    const result = await db.query<{ id: string }>(
        `SELECT id FROM "OrganizationMembership"
         WHERE "organizationId" = $1 AND "userId" = $2 AND status = 'ACTIVE'
         LIMIT 1`,
        [orgId, userId],
    );
    return result.rows[0]?.id ?? null;
}

export async function getOrgProjects(orgId: string): Promise<ProjectListItem[]> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return [];

    const membershipId = await getMembershipId(orgId, session.user.id);
    if (!membershipId) return [];

    const result = await db.query<{
        id: string;
        name: string;
        role: ProjectParticipantRole;
        createdAt: Date;
    }>(
        `SELECT p.id, p.name, pp.role, p."createdAt"
         FROM "Project" p
         JOIN "ProjectParticipant" pp ON pp."projectId" = p.id
         WHERE pp."organizationId" = $1
         ORDER BY p."createdAt" DESC`,
        [orgId],
    );

    return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        participantRole: row.role,
        createdAt: row.createdAt.toISOString(),
    }));
}

export type ProjectDetail = {
    id: string;
    name: string;
    participantRole: ProjectParticipantRole;
    createdAt: string;
};

export async function getProjectForOrg(
    orgId: string,
    projectId: string,
): Promise<ProjectDetail | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    const membershipId = await getMembershipId(orgId, session.user.id);
    if (!membershipId) return null;

    const result = await db.query<{
        id: string;
        name: string;
        role: ProjectParticipantRole;
        createdAt: Date;
    }>(
        `SELECT p.id, p.name, pp.role, p."createdAt"
         FROM "Project" p
         JOIN "ProjectParticipant" pp ON pp."projectId" = p.id
         WHERE p.id = $1 AND pp."organizationId" = $2
         LIMIT 1`,
        [projectId, orgId],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        participantRole: row.role,
        createdAt: row.createdAt.toISOString(),
    };
}

export async function createProject(
    orgId: string,
    name: string,
): Promise<{ projectId: string } | { error: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const trimmedName = name.trim();
    if (!trimmedName) return { error: "Le nom du projet est requis." };

    const membershipId = await getMembershipId(orgId, session.user.id);
    if (!membershipId) return { error: "Accès refusé." };

    const client = await db.connect();
    try {
        await client.query("BEGIN");

        const projectResult = await client.query<{ id: string }>(
            `INSERT INTO "Project" (id, "leadOrganizationId", name, "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW())
             RETURNING id`,
            [orgId, trimmedName],
        );
        const projectId = projectResult.rows[0].id;

        await client.query(
            `INSERT INTO "ProjectParticipant" (id, "projectId", "organizationId", role, "createdAt", "updatedAt")
             VALUES (gen_random_uuid()::text, $1, $2, 'LEAD', NOW(), NOW())`,
            [projectId, orgId],
        );

        await client.query("COMMIT");
        return { projectId };
    } catch {
        await client.query("ROLLBACK");
        return { error: "Erreur lors de la création du projet." };
    } finally {
        client.release();
    }
}
