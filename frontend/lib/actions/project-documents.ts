"use server";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { r2, R2_BUCKET } from "@/lib/r2";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { resolveProjectAccess } from "@/lib/actions/projects";
import { sendEmail } from "@/lib/mail/send-email";
import { env } from "@/lib/env";
import { DOCUMENT_CATEGORIES } from "@/lib/document-constants";
import type { DocumentCategory, DocumentScope, DocumentRequestStatus } from "@/lib/document-constants";

export type { DocumentCategory, DocumentScope, DocumentRequestStatus };

// ─── Types ──────────────────────────────────────────────────────────────────

export type DocumentItem = {
    id: string;
    name: string;
    fileKey: string;
    mimeType: string;
    sizeBytes: string;
    category: DocumentCategory;
    scope: DocumentScope;
    workPackageId: string | null;
    workPackageName: string | null;
    workPackageColor: string | null;
    uploaderName: string;
    createdAt: string;
};

export type DocumentRequestItem = {
    id: string;
    label: string;
    category: DocumentCategory;
    requestedFromRole: string;
    requestedFromWorkPackageId: string | null;
    requestedFromWorkPackageName: string | null;
    requestedByName: string;
    dueDate: string | null;
    status: DocumentRequestStatus;
    createdAt: string;
};

export type WorkPackageRef = {
    id: string;
    name: string;
    color: string | null;
};

export type ProjectDocumentsData = {
    documents: DocumentItem[];
    requests: DocumentRequestItem[];
    storageBytes: string;
    callerParticipantRole: string;
    workPackages: WorkPackageRef[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function revalidate(orgSlug: string, projectSlug: string) {
    revalidatePath(`/${orgSlug}/projects/${projectSlug}/documents`);
}

async function getMembershipId(orgSlug: string, userId: string): Promise<string | null> {
    const r = await db.query<{ id: string }>(
        `SELECT om.id FROM "OrganizationMembership" om
         JOIN "Organization" o ON o.id = om."organizationId"
         WHERE o.slug = $1 AND om."userId" = $2 AND om.status = 'ACTIVE'
         LIMIT 1`,
        [orgSlug, userId],
    );
    return r.rows[0]?.id ?? null;
}

async function getProjectId(orgSlug: string, projectSlug: string): Promise<string | null> {
    const r = await db.query<{ id: string }>(
        `SELECT p.id FROM "Project" p
         JOIN "ProjectParticipant" pp ON pp."projectId" = p.id
         JOIN "Organization" o ON o.id = pp."organizationId"
         WHERE p.slug = $1 AND o.slug = $2
         LIMIT 1`,
        [projectSlug, orgSlug],
    );
    return r.rows[0]?.id ?? null;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getProjectDocuments(
    orgSlug: string,
    projectSlug: string,
): Promise<ProjectDocumentsData | null> {
    const session = await getSession();
    if (!session) return null;

    const access = await resolveProjectAccess(orgSlug, projectSlug);
    if (!access) return null;

    const { projectId, callerParticipantRole } = access;

    // Filtre de scope selon le rôle
    const scopeFilter =
        callerParticipantRole === "CLIENT"
            ? `AND pd.scope IN ('GLOBAL', 'CLIENT')`
            : ""; // LEAD et SUBCONTRACTOR voient tout pour l'instant

    const [docsResult, requestsResult, storageResult, wpResult] = await Promise.all([
        db.query<DocumentItem & { workPackageColor: string | null }>(
            `SELECT
                pd.id,
                pd.name,
                pd."fileKey",
                pd."mimeType",
                pd."sizeBytes"::text       AS "sizeBytes",
                pd.category::text          AS category,
                pd.scope::text             AS scope,
                pd."workPackageId",
                wp.name                    AS "workPackageName",
                wp.color::text             AS "workPackageColor",
                u.name                     AS "uploaderName",
                pd."createdAt"::text       AS "createdAt"
             FROM "ProjectDocument" pd
             JOIN "OrganizationMembership" om ON om.id = pd."uploadedByMembershipId"
             JOIN "User" u ON u.id = om."userId"
             LEFT JOIN "WorkPackage" wp ON wp.id = pd."workPackageId"
             WHERE pd."projectId" = $1 ${scopeFilter}
             ORDER BY pd."createdAt" DESC`,
            [projectId],
        ),
        db.query<DocumentRequestItem>(
            `SELECT
                pdr.id,
                pdr.label,
                pdr.category::text                         AS category,
                pdr."requestedFromRole"::text              AS "requestedFromRole",
                pdr."requestedFromWorkPackageId",
                wp.name                                    AS "requestedFromWorkPackageName",
                u.name                                     AS "requestedByName",
                pdr."dueDate"::text                        AS "dueDate",
                pdr.status::text                           AS status,
                pdr."createdAt"::text                      AS "createdAt"
             FROM "ProjectDocumentRequest" pdr
             JOIN "OrganizationMembership" om ON om.id = pdr."requestedByMembershipId"
             JOIN "User" u ON u.id = om."userId"
             LEFT JOIN "WorkPackage" wp ON wp.id = pdr."requestedFromWorkPackageId"
             WHERE pdr."projectId" = $1
               AND pdr.status != 'CANCELLED'
             ORDER BY pdr."createdAt" DESC`,
            [projectId],
        ),
        db.query<{ total: string }>(
            `SELECT COALESCE(SUM("sizeBytes"), 0)::text AS total
             FROM "ProjectDocument"
             WHERE "projectId" = $1`,
            [projectId],
        ),
        db.query<WorkPackageRef>(
            `SELECT id, name, color::text AS color
             FROM "WorkPackage"
             WHERE "projectId" = $1
             ORDER BY position ASC`,
            [projectId],
        ),
    ]);

    return {
        documents: docsResult.rows,
        requests: requestsResult.rows,
        storageBytes: storageResult.rows[0]?.total ?? "0",
        callerParticipantRole,
        workPackages: wpResult.rows,
    };
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export type RegisterDocumentInput = {
    name: string;
    category: DocumentCategory;
    scope: DocumentScope;
    workPackageId: string | null;
    fileKey: string;
    sizeBytes: number;
    mimeType: string;
    /** Si fourni, la demande est automatiquement marquée FULFILLED */
    linkedRequestId?: string | null;
};

export async function registerProjectDocument(
    orgSlug: string,
    projectSlug: string,
    input: RegisterDocumentInput,
): Promise<{ error?: string; id?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembershipId(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    const projectId = await getProjectId(orgSlug, projectSlug);
    if (!projectId) return { error: "Projet introuvable" };

    const name = input.name.trim();
    if (!name) return { error: "Le nom est requis" };

    // Valider le workPackageId si scope = WORKPACKAGE
    if (input.scope === "WORKPACKAGE" && input.workPackageId) {
        const wpCheck = await db.query<{ id: string }>(
            `SELECT id FROM "WorkPackage" WHERE id = $1 AND "projectId" = $2 LIMIT 1`,
            [input.workPackageId, projectId],
        );
        if (!wpCheck.rows.length) return { error: "Lot introuvable" };
    }

    const workPackageId = input.scope === "WORKPACKAGE" ? (input.workPackageId ?? null) : null;

    const id = randomUUID();
    await db.query(
        `INSERT INTO "ProjectDocument"
            (id, "projectId", "uploadedByMembershipId", name, "fileKey", "mimeType", "sizeBytes", category, scope, "workPackageId", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::\"DocumentCategory\", $9::\"DocumentScope\", $10, NOW())`,
        [id, projectId, membershipId, name, input.fileKey, input.mimeType, input.sizeBytes,
         input.category, input.scope, workPackageId],
    );

    // Auto-fulfill la demande liée si fournie
    if (input.linkedRequestId) {
        await db.query(
            `UPDATE "ProjectDocumentRequest"
             SET status = 'FULFILLED', "updatedAt" = NOW()
             WHERE id = $1 AND "projectId" = $2 AND status = 'PENDING'`,
            [input.linkedRequestId, projectId],
        );
    }

    revalidate(orgSlug, projectSlug);
    return { id };
}

export async function deleteProjectDocument(
    orgSlug: string,
    projectSlug: string,
    docId: string,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    // Seul le LEAD peut supprimer
    const access = await resolveProjectAccess(orgSlug, projectSlug);
    if (!access) return { error: "Accès refusé" };
    if (access.callerParticipantRole !== "LEAD") return { error: "Seul le pilote peut supprimer des documents" };

    const docResult = await db.query<{ fileKey: string }>(
        `DELETE FROM "ProjectDocument"
         WHERE id = $1 AND "projectId" = $2
         RETURNING "fileKey"`,
        [docId, access.projectId],
    );
    if (!docResult.rows.length) return { error: "Document introuvable" };

    // Suppression R2 en fire-and-forget
    r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: docResult.rows[0].fileKey })).catch(() => {});

    revalidate(orgSlug, projectSlug);
    return {};
}

// ─── Document Requests ───────────────────────────────────────────────────────

export type CreateDocumentRequestInput = {
    label: string;
    category: DocumentCategory;
    requestedFromRole: "CLIENT" | "LEAD" | "WORKPACKAGE";
    requestedFromWorkPackageId: string | null;
    dueDate: string | null;
};

export async function createDocumentRequest(
    orgSlug: string,
    projectSlug: string,
    input: CreateDocumentRequestInput,
): Promise<{ error?: string; id?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembershipId(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    const projectResult = await db.query<{ id: string; name: string }>(
        `SELECT p.id, p.name FROM "Project" p
         JOIN "ProjectParticipant" pp ON pp."projectId" = p.id
         JOIN "Organization" o ON o.id = pp."organizationId"
         WHERE p.slug = $1 AND o.slug = $2
         LIMIT 1`,
        [projectSlug, orgSlug],
    );
    if (!projectResult.rows.length) return { error: "Projet introuvable" };
    const { id: projectId, name: projectName } = projectResult.rows[0];

    const label = input.label.trim();
    if (!label) return { error: "La description est requise" };

    // requestedFromRole = CLIENT | LEAD | WORKPACKAGE (WORKPACKAGE = ciblé sur un lot)
    // On mappe vers l'enum Prisma ProjectParticipantRole
    const dbRole =
        input.requestedFromRole === "WORKPACKAGE"
            ? "SUBCONTRACTOR"
            : input.requestedFromRole;

    let requestedFromWorkPackageId: string | null = null;
    if (input.requestedFromRole === "WORKPACKAGE" && input.requestedFromWorkPackageId) {
        const wpCheck = await db.query<{ id: string }>(
            `SELECT id FROM "WorkPackage" WHERE id = $1 AND "projectId" = $2 LIMIT 1`,
            [input.requestedFromWorkPackageId, projectId],
        );
        if (!wpCheck.rows.length) return { error: "Lot introuvable" };
        requestedFromWorkPackageId = input.requestedFromWorkPackageId;
    }

    const dueDate = input.dueDate ? new Date(input.dueDate).toISOString() : null;

    const id = randomUUID();
    await db.query(
        `INSERT INTO "ProjectDocumentRequest"
            (id, "projectId", label, category, "requestedByMembershipId", "requestedFromRole",
             "requestedFromWorkPackageId", "dueDate", status, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4::\"DocumentCategory\", $5, $6::\"ProjectParticipantRole\", $7, $8, 'PENDING', NOW(), NOW())`,
        [id, projectId, label, input.category, membershipId, dbRole,
         requestedFromWorkPackageId, dueDate],
    );

    // Envoi notification email — fire-and-forget
    sendDocumentRequestEmail({
        orgSlug,
        projectId,
        projectName,
        projectSlug,
        requesterName: session.user.name,
        label,
        category: input.category,
        dueDate: input.dueDate,
        requestedFromRole: input.requestedFromRole,
        requestedFromWorkPackageId,
    }).catch((err) => console.error("[createDocumentRequest] email error:", err));

    revalidate(orgSlug, projectSlug);
    return { id };
}

export async function cancelDocumentRequest(
    orgSlug: string,
    projectSlug: string,
    requestId: string,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const access = await resolveProjectAccess(orgSlug, projectSlug);
    if (!access) return { error: "Accès refusé" };

    await db.query(
        `UPDATE "ProjectDocumentRequest"
         SET status = 'CANCELLED', "updatedAt" = NOW()
         WHERE id = $1 AND "projectId" = $2 AND status = 'PENDING'`,
        [requestId, access.projectId],
    );

    revalidate(orgSlug, projectSlug);
    return {};
}

export async function fulfillDocumentRequest(
    orgSlug: string,
    projectSlug: string,
    requestId: string,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const access = await resolveProjectAccess(orgSlug, projectSlug);
    if (!access) return { error: "Accès refusé" };

    await db.query(
        `UPDATE "ProjectDocumentRequest"
         SET status = 'FULFILLED', "updatedAt" = NOW()
         WHERE id = $1 AND "projectId" = $2`,
        [requestId, access.projectId],
    );

    revalidate(orgSlug, projectSlug);
    return {};
}

// ─── Email ───────────────────────────────────────────────────────────────────

async function sendDocumentRequestEmail(params: {
    orgSlug: string;
    projectId: string;
    projectName: string;
    projectSlug: string;
    requesterName: string;
    label: string;
    category: DocumentCategory;
    dueDate: string | null;
    requestedFromRole: string;
    requestedFromWorkPackageId: string | null;
}) {
    // Récupérer les emails des destinataires (FOUNDER + MANAGER de l'org cible)
    let recipientsQuery: { email: string; name: string; orgSlug: string }[] = [];

    if (params.requestedFromRole === "CLIENT") {
        const r = await db.query<{ email: string; name: string; orgSlug: string }>(
            `SELECT u.email, u.name, o.slug AS "orgSlug"
             FROM "ProjectParticipant" pp
             JOIN "Organization" o ON o.id = pp."organizationId"
             JOIN "OrganizationMembership" om ON om."organizationId" = o.id
             JOIN "User" u ON u.id = om."userId"
             WHERE pp."projectId" = $1
               AND pp.role = 'CLIENT'
               AND om.status = 'ACTIVE'
               AND om.role IN ('FOUNDER', 'MANAGER')`,
            [params.projectId],
        );
        recipientsQuery = r.rows;
    } else if (params.requestedFromRole === "WORKPACKAGE" && params.requestedFromWorkPackageId) {
        const r = await db.query<{ email: string; name: string; orgSlug: string }>(
            `SELECT u.email, u.name, o.slug AS "orgSlug"
             FROM "WorkPackage" wp
             JOIN "ProjectParticipant" pp ON pp.id = wp."assignedProjectParticipantId"
             JOIN "Organization" o ON o.id = pp."organizationId"
             JOIN "OrganizationMembership" om ON om."organizationId" = o.id
             JOIN "User" u ON u.id = om."userId"
             WHERE wp.id = $1
               AND om.status = 'ACTIVE'
               AND om.role IN ('FOUNDER', 'MANAGER')`,
            [params.requestedFromWorkPackageId],
        );
        recipientsQuery = r.rows;
    } else if (params.requestedFromRole === "LEAD") {
        const r = await db.query<{ email: string; name: string; orgSlug: string }>(
            `SELECT u.email, u.name, o.slug AS "orgSlug"
             FROM "ProjectParticipant" pp
             JOIN "Organization" o ON o.id = pp."organizationId"
             JOIN "OrganizationMembership" om ON om."organizationId" = o.id
             JOIN "User" u ON u.id = om."userId"
             WHERE pp."projectId" = $1
               AND pp.role = 'LEAD'
               AND om.status = 'ACTIVE'
               AND om.role IN ('FOUNDER', 'MANAGER')`,
            [params.projectId],
        );
        recipientsQuery = r.rows;
    }

    if (!recipientsQuery.length) return;

    const categoryLabel = DOCUMENT_CATEGORIES[params.category]?.label ?? params.category;
    const dueDateStr = params.dueDate
        ? new Date(params.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
        : null;
    const baseUrl = env.BETTER_AUTH_URL;

    for (const recipient of recipientsQuery) {
        const projectUrl = `${baseUrl}/${recipient.orgSlug}/projects/${params.projectSlug}/documents`;

        const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="padding:32px 40px 0;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">Nouvelle demande</p>
            <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;">Document requis</h1>
            <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
              <strong>${params.requesterName}</strong> vous demande de fournir un document dans le cadre du projet
              <strong>${params.projectName}</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin:0 0 24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Document demandé</p>
                <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">${params.label}</p>
                <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Catégorie : <span style="color:#374151;font-weight:500;">${categoryLabel}</span></p>
                ${dueDateStr ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Échéance : <span style="color:#d97706;font-weight:500;">${dueDateStr}</span></p>` : ""}
              </td></tr>
            </table>
            <p style="margin:0 0 24px;">
              <a href="${projectUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">
                Voir la demande
              </a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">Ce message a été envoyé automatiquement par Batilib. Ne pas répondre à cet email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        await sendEmail({
            to: recipient.email,
            subject: `Demande de document — ${params.projectName}`,
            html,
        });
    }
}
