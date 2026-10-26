"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { sendEmail } from "@/lib/mail/send-email";

// ─── Types ────────────────────────────────────────────────

export type ProjectParticipantRole = "LEAD" | "CLIENT" | "SUBCONTRACTOR";

export type ProjectMemberItem = {
    membershipId: string;
    userId: string;
    name: string;
    email: string;
    image: string | null;
};

export type ProjectParticipantItem = {
    participantId: string;
    role: ProjectParticipantRole;
    organization: {
        id: string;
        name: string;
        slug: string;
        kind: string;
        logoUrl: string | null;
    };
    members: ProjectMemberItem[];
};

export type ProjectMembersData = {
    participants: ProjectParticipantItem[];
    callerRole: string;
    callerParticipantRole: ProjectParticipantRole;
};

export type ProjectClientInvitation = {
    email: string;
    expiresAt: string;
};

// ─── Helpers ──────────────────────────────────────────────

async function getCallerRole(orgSlug: string, userId: string): Promise<string | null> {
    const result = await db.query<{ role: string }>(
        `SELECT om.role FROM "OrganizationMembership" om
         JOIN "Organization" o ON o.id = om."organizationId"
         WHERE o.slug = $1 AND om."userId" = $2 AND om.status = 'ACTIVE'
         LIMIT 1`,
        [orgSlug, userId],
    );
    return result.rows[0]?.role ?? null;
}

async function getProjectId(orgSlug: string, projectSlug: string): Promise<string | null> {
    const result = await db.query<{ id: string }>(
        `SELECT p.id FROM "Project" p
         WHERE p.slug = $1
           AND p."leadOrganizationId" = (SELECT id FROM "Organization" WHERE slug = $2)
         LIMIT 1`,
        [projectSlug, orgSlug],
    );
    return result.rows[0]?.id ?? null;
}

// ─── Queries ──────────────────────────────────────────────

export async function getProjectMembers(
    orgSlug: string,
    projectSlug: string,
): Promise<ProjectMembersData | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    const callerRole = await getCallerRole(orgSlug, session.user.id);
    if (!callerRole) return null;

    // Resolve caller's participant role (LEAD / CLIENT / SUBCONTRACTOR)
    const callerParticipantResult = await db.query<{ role: ProjectParticipantRole }>(
        `SELECT pp.role
         FROM "ProjectParticipant" pp
         JOIN "Project" p ON p.id = pp."projectId"
         WHERE p.slug = $1
           AND pp."organizationId" = (SELECT id FROM "Organization" WHERE slug = $2)
         LIMIT 1`,
        [projectSlug, orgSlug],
    );
    const callerParticipantRole = callerParticipantResult.rows[0]?.role;
    if (!callerParticipantRole) return null;

    const ppResult = await db.query<{
        participantId: string;
        role: ProjectParticipantRole;
        orgId: string;
        orgName: string;
        orgSlug: string;
        orgKind: string;
        orgLogoUrl: string | null;
    }>(
        `SELECT pp.id AS "participantId", pp.role,
                o.id AS "orgId", o.name AS "orgName", o.slug AS "orgSlug",
                o.kind AS "orgKind", o."logoUrl" AS "orgLogoUrl"
         FROM "ProjectParticipant" pp
         JOIN "Organization" o ON o.id = pp."organizationId"
         JOIN "Project" p ON p.id = pp."projectId"
         WHERE p.slug = $1
           AND EXISTS (
               SELECT 1 FROM "ProjectParticipant" pp2
               WHERE pp2."projectId" = p.id
               AND pp2."organizationId" = (SELECT id FROM "Organization" WHERE slug = $2)
           )
         ORDER BY CASE pp.role WHEN 'LEAD' THEN 1 WHEN 'CLIENT' THEN 2 ELSE 3 END`,
        [projectSlug, orgSlug],
    );

    const participantIds = ppResult.rows.map((r) => r.participantId);
    const membersMap = new Map<string, ProjectMemberItem[]>();

    if (participantIds.length > 0) {
        const membersResult = await db.query<{
            participantId: string;
            membershipId: string;
            userId: string;
            name: string;
            email: string;
            image: string | null;
        }>(
            `SELECT ppm."projectParticipantId" AS "participantId",
                    om.id AS "membershipId",
                    u.id AS "userId",
                    u.name, u.email, u.image
             FROM "ProjectParticipantMember" ppm
             JOIN "OrganizationMembership" om ON om.id = ppm."organizationMembershipId"
             JOIN "User" u ON u.id = om."userId"
             WHERE ppm."projectParticipantId" = ANY($1::text[])
             ORDER BY u.name ASC`,
            [participantIds],
        );

        for (const m of membersResult.rows) {
            if (!membersMap.has(m.participantId)) membersMap.set(m.participantId, []);
            membersMap.get(m.participantId)!.push({
                membershipId: m.membershipId,
                userId: m.userId,
                name: m.name,
                email: m.email,
                image: m.image,
            });
        }
    }

    const participants: ProjectParticipantItem[] = ppResult.rows.map((r) => ({
        participantId: r.participantId,
        role: r.role,
        organization: {
            id: r.orgId,
            name: r.orgName,
            slug: r.orgSlug,
            kind: r.orgKind,
            logoUrl: r.orgLogoUrl,
        },
        members: membersMap.get(r.participantId) ?? [],
    }));

    return { participants, callerRole, callerParticipantRole };
}

export async function getProjectClientInvitation(
    orgSlug: string,
    projectSlug: string,
): Promise<ProjectClientInvitation | null> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return null;

    const callerRole = await getCallerRole(orgSlug, session.user.id);
    if (!callerRole) return null;

    const result = await db.query<{ email: string; expiresAt: Date }>(
        `SELECT pi."invitedEmail" AS email, pi."expiresAt"
         FROM "ProjectInvitation" pi
         JOIN "Project" p ON p.id = pi."projectId"
         WHERE p.slug = $1
           AND p."leadOrganizationId" = (SELECT id FROM "Organization" WHERE slug = $2)
           AND pi."expiresAt" > NOW()
         LIMIT 1`,
        [projectSlug, orgSlug],
    );

    if (!result.rows.length) return null;
    return {
        email: result.rows[0].email,
        expiresAt: result.rows[0].expiresAt.toISOString(),
    };
}

// ─── Mutations ────────────────────────────────────────────

export async function inviteClientToProject(
    orgSlug: string,
    projectSlug: string,
    clientEmail: string,
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const callerRole = await getCallerRole(orgSlug, session.user.id);
    if (!callerRole || (callerRole !== "FOUNDER" && callerRole !== "MANAGER")) {
        return { error: "Action réservée aux fondateurs et managers" };
    }

    const projectResult = await db.query<{ id: string; name: string; orgName: string }>(
        `SELECT p.id, p.name, o.name AS "orgName"
         FROM "Project" p
         JOIN "Organization" o ON o.id = p."leadOrganizationId"
         WHERE p.slug = $1 AND p."leadOrganizationId" = (SELECT id FROM "Organization" WHERE slug = $2)
         LIMIT 1`,
        [projectSlug, orgSlug],
    );
    if (!projectResult.rows.length) return { error: "Projet introuvable" };
    const { id: projectId, name: projectName, orgName } = projectResult.rows[0];

    const existingClient = await db.query(
        `SELECT id FROM "ProjectParticipant" WHERE "projectId" = $1 AND role = 'CLIENT' LIMIT 1`,
        [projectId],
    );
    if (existingClient.rows.length) return { error: "Ce projet a déjà un client assigné" };

    const existingInvitation = await db.query(
        `SELECT id FROM "ProjectInvitation" WHERE "projectId" = $1 AND "expiresAt" > NOW() LIMIT 1`,
        [projectId],
    );
    if (existingInvitation.rows.length) {
        return { error: "Une invitation est déjà en attente pour ce projet" };
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const normalizedEmail = clientEmail.toLowerCase().trim();

    await db.query(
        `INSERT INTO "ProjectInvitation"
           (id, "projectId", "invitedEmail", token, "expiresAt", "invitedById", "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW())`,
        [projectId, normalizedEmail, token, expiresAt, session.user.id],
    );

    const inviteUrl = `${process.env.BETTER_AUTH_URL}/join-project?token=${token}`;

    await sendEmail({
        to: normalizedEmail,
        subject: `Vous êtes invité à rejoindre le projet "${projectName}" sur Batilib`,
        html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; color: #111827; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
  <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600;">Invitation au projet ${projectName}</h2>
  <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.5;">
    <strong style="color: #111827;">${session.user.name}</strong> de <strong style="color: #111827;">${orgName}</strong>
    vous invite à rejoindre le projet <strong style="color: #111827;">${projectName}</strong> en tant que client sur Batilib.
  </p>
  <a href="${inviteUrl}" style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-size: 14px; font-weight: 500;">
    Voir l'invitation
  </a>
  <p style="margin: 28px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
    Ce lien expire dans 7 jours. Si vous n'êtes pas concerné par cette invitation, ignorez cet email.
  </p>
</body>
</html>`,
    });

    return {};
}

export async function resendProjectInvitation(
    orgSlug: string,
    projectSlug: string,
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const callerRole = await getCallerRole(orgSlug, session.user.id);
    if (!callerRole || (callerRole !== "FOUNDER" && callerRole !== "MANAGER")) {
        return { error: "Action réservée aux fondateurs et managers" };
    }

    const invResult = await db.query<{
        id: string;
        invitedEmail: string;
        projectName: string;
        orgName: string;
    }>(
        `SELECT pi.id, pi."invitedEmail", p.name AS "projectName", o.name AS "orgName"
         FROM "ProjectInvitation" pi
         JOIN "Project" p ON p.id = pi."projectId"
         JOIN "Organization" o ON o.id = p."leadOrganizationId"
         WHERE p.slug = $1 AND p."leadOrganizationId" = (SELECT id FROM "Organization" WHERE slug = $2)
         LIMIT 1`,
        [projectSlug, orgSlug],
    );
    if (!invResult.rows.length) return { error: "Invitation introuvable" };
    const { id, invitedEmail, projectName, orgName } = invResult.rows[0];

    const newToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.query(
        `UPDATE "ProjectInvitation" SET token = $1, "expiresAt" = $2 WHERE id = $3`,
        [newToken, expiresAt, id],
    );

    const inviteUrl = `${process.env.BETTER_AUTH_URL}/join-project?token=${newToken}`;

    await sendEmail({
        to: invitedEmail,
        subject: `Rappel : invitation au projet "${projectName}" sur Batilib`,
        html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="font-family: sans-serif; color: #111827; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
  <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600;">Rappel — Invitation au projet ${projectName}</h2>
  <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.5;">
    <strong style="color: #111827;">${session.user.name}</strong> de <strong style="color: #111827;">${orgName}</strong>
    vous rappelle votre invitation à rejoindre le projet <strong style="color: #111827;">${projectName}</strong> sur Batilib.
  </p>
  <a href="${inviteUrl}" style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 10px 22px; border-radius: 6px; font-size: 14px; font-weight: 500;">
    Voir l'invitation
  </a>
  <p style="margin: 28px 0 0; color: #9ca3af; font-size: 12px; line-height: 1.5;">
    Ce lien expire dans 7 jours. Si vous n'êtes pas concerné par cette invitation, ignorez cet email.
  </p>
</body>
</html>`,
    });

    return {};
}

export async function cancelProjectInvitation(
    orgSlug: string,
    projectSlug: string,
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const callerRole = await getCallerRole(orgSlug, session.user.id);
    if (!callerRole || (callerRole !== "FOUNDER" && callerRole !== "MANAGER")) {
        return { error: "Action réservée aux fondateurs et managers" };
    }

    const projectId = await getProjectId(orgSlug, projectSlug);
    if (!projectId) return { error: "Projet introuvable" };

    await db.query(`DELETE FROM "ProjectInvitation" WHERE "projectId" = $1`, [projectId]);
    return {};
}

export async function removeProjectClient(
    orgSlug: string,
    projectSlug: string,
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { error: "Non authentifié" };

    const callerRole = await getCallerRole(orgSlug, session.user.id);
    if (!callerRole || (callerRole !== "FOUNDER" && callerRole !== "MANAGER")) {
        return { error: "Action réservée aux fondateurs et managers" };
    }

    const projectId = await getProjectId(orgSlug, projectSlug);
    if (!projectId) return { error: "Projet introuvable" };

    await db.query(
        `DELETE FROM "ProjectParticipant" WHERE "projectId" = $1 AND role = 'CLIENT'`,
        [projectId],
    );
    return {};
}
