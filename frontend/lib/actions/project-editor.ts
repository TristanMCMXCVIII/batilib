"use server";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getLibraryTree, type LibraryTree, type WorkPackageTemplateRef } from "./work-item-templates";

// ─── Types ────────────────────────────────────────────────

export type WorkItemStatus = "DRAFT" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type WorkItemItem = {
    id: string;
    projectSpaceId: string | null;
    projectSpaceName: string | null;
    workPackageId: string | null;
    workPackageName: string | null;
    workPackageColor: string | null;
    sourceWorkItemTemplateId: string | null;
    name: string;
    description: string | null;
    quantity: string;
    unit: string;
    status: WorkItemStatus;
    position: number;
    // Financier
    puEstimeHt: string | null;
    puSubcontractorHt: string | null;
    quantitySubcontractor: string | null;
    marginRate: string | null;
    tauxTva: string;
};

export type ProjectSpaceItem = {
    id: string;
    parentId: string | null;
    name: string;
    position: number;
    children: ProjectSpaceItem[];
    workItems: WorkItemItem[];
};

export type WorkPackageItem = {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    marginRate: string | null;
    position: number;
    workItems: WorkItemItem[];
};

export type ProjectEditorData = {
    project: { id: string; name: string; slug: string; defaultMarginRate: string | null };
    spaces: ProjectSpaceItem[];
    workPackages: WorkPackageItem[];
    libraryTree: LibraryTree;
    workPackageTemplates: WorkPackageTemplateRef[];
};

// ─── Helpers ──────────────────────────────────────────────

async function getMembership(orgSlug: string, userId: string): Promise<string | null> {
    const result = await db.query<{ id: string }>(
        `SELECT om.id FROM "OrganizationMembership" om
         JOIN "Organization" o ON o.id = om."organizationId"
         WHERE o.slug = $1 AND om."userId" = $2 AND om.status = 'ACTIVE'
         LIMIT 1`,
        [orgSlug, userId],
    );
    return result.rows[0]?.id ?? null;
}

async function getProjectId(orgSlug: string, projectSlug: string): Promise<string | null> {
    const result = await db.query<{ id: string }>(
        `SELECT p.id FROM "Project" p
         JOIN "Organization" o ON o.id = p."leadOrganizationId"
         WHERE p.slug = $1 AND o.slug = $2
         LIMIT 1`,
        [projectSlug, orgSlug],
    );
    return result.rows[0]?.id ?? null;
}

function buildSpacesTree(
    spaces: Array<{ id: string; parentId: string | null; name: string; position: number }>,
    itemsBySpace: Map<string | null, WorkItemItem[]>,
): ProjectSpaceItem[] {
    function buildSpace(raw: { id: string; parentId: string | null; name: string; position: number }): ProjectSpaceItem {
        return {
            ...raw,
            children: spaces
                .filter((s) => s.parentId === raw.id)
                .sort((a, b) => a.position - b.position)
                .map(buildSpace),
            workItems: itemsBySpace.get(raw.id) ?? [],
        };
    }
    return spaces
        .filter((s) => s.parentId === null)
        .sort((a, b) => a.position - b.position)
        .map(buildSpace);
}

function revalidate(orgSlug: string, projectSlug: string) {
    revalidatePath(`/${orgSlug}/projects/${projectSlug}/chantier`);
}

// ─── Read ──────────────────────────────────────────────────

export async function getProjectEditorData(
    orgSlug: string,
    projectSlug: string,
): Promise<ProjectEditorData | null> {
    const session = await getSession();
    if (!session) return null;

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return null;

    const projectResult = await db.query<{ id: string; name: string; slug: string; defaultMarginRate: string | null }>(
        `SELECT p.id, p.name, p.slug, p."defaultMarginRate"::text AS "defaultMarginRate"
         FROM "Project" p
         JOIN "ProjectParticipant" pp ON pp."projectId" = p.id
         JOIN "Organization" o ON o.id = pp."organizationId"
         WHERE p.slug = $1 AND o.slug = $2
         LIMIT 1`,
        [projectSlug, orgSlug],
    );
    if (!projectResult.rows.length) return null;
    const project = projectResult.rows[0];

    const [spacesResult, itemsResult, packagesResult] = await Promise.all([
        db.query<{ id: string; parentId: string | null; name: string; position: number }>(
            `SELECT id, "parentId", name, position
             FROM "ProjectSpace"
             WHERE "projectId" = $1
             ORDER BY position ASC`,
            [project.id],
        ),
        db.query<WorkItemItem>(
            `SELECT
                wi.id,
                wi."projectSpaceId",
                ps.name                       AS "projectSpaceName",
                wi."workPackageId",
                wp.name                       AS "workPackageName",
                wp.color::text                AS "workPackageColor",
                wi."sourceWorkItemTemplateId",
                wi.name,
                wi.description,
                wi.quantity::text             AS quantity,
                wi.unit,
                wi.status::text               AS status,
                wi.position,
                wi."puEstimeHt"::text         AS "puEstimeHt",
                wi."puSubcontractorHt"::text  AS "puSubcontractorHt",
                wi."quantitySubcontractor"::text AS "quantitySubcontractor",
                wi."marginRate"::text         AS "marginRate",
                wi."tauxTva"::text            AS "tauxTva"
             FROM "WorkItem" wi
             LEFT JOIN "WorkPackage" wp ON wp.id = wi."workPackageId"
             LEFT JOIN "ProjectSpace" ps ON ps.id = wi."projectSpaceId"
             WHERE wi."projectId" = $1
             ORDER BY wi.position ASC`,
            [project.id],
        ),
        db.query<{ id: string; name: string; description: string | null; color: string | null; marginRate: string | null; position: number }>(
            `SELECT id, name, description, color::text AS color, "marginRate"::text AS "marginRate", position
             FROM "WorkPackage"
             WHERE "projectId" = $1
             ORDER BY position ASC`,
            [project.id],
        ),
    ]);

    const itemsBySpace = new Map<string | null, WorkItemItem[]>();
    const itemsByPackage = new Map<string | null, WorkItemItem[]>();

    for (const item of itemsResult.rows) {
        const sk = item.projectSpaceId;
        if (!itemsBySpace.has(sk)) itemsBySpace.set(sk, []);
        itemsBySpace.get(sk)!.push(item);

        const pk = item.workPackageId;
        if (!itemsByPackage.has(pk)) itemsByPackage.set(pk, []);
        itemsByPackage.get(pk)!.push(item);
    }

    const workPackages: WorkPackageItem[] = packagesResult.rows.map((wp) => ({
        ...wp,
        workItems: itemsByPackage.get(wp.id) ?? [],
    }));

    const { tree: libraryTree, workPackageTemplates } = await getLibraryTree(orgSlug);

    return {
        project,
        spaces: buildSpacesTree(spacesResult.rows, itemsBySpace),
        workPackages,
        libraryTree,
        workPackageTemplates,
    };
}

// ─── Spaces ───────────────────────────────────────────────

export async function createProjectSpace(
    orgSlug: string,
    projectSlug: string,
    data: { name: string; parentId?: string | null },
): Promise<{ error?: string; id?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    const projectId = await getProjectId(orgSlug, projectSlug);
    if (!projectId) return { error: "Projet introuvable" };

    const name = data.name.trim();
    if (!name) return { error: "Le nom est requis" };

    const parentId = data.parentId ?? null;

    // Vérifie que le parentId appartient bien au même projet
    if (parentId) {
        const parentCheck = await db.query<{ id: string }>(
            `SELECT id FROM "ProjectSpace" WHERE id = $1 AND "projectId" = $2 LIMIT 1`,
            [parentId, projectId],
        );
        if (!parentCheck.rows.length) return { error: "Espace parent introuvable" };
    }

    const posResult = await db.query<{ max: number }>(
        `SELECT COALESCE(MAX(position), 0) AS max
         FROM "ProjectSpace"
         WHERE "projectId" = $1 AND "parentId" IS NOT DISTINCT FROM $2`,
        [projectId, parentId],
    );
    const position = (posResult.rows[0]?.max ?? 0) + 1;

    const id = randomUUID();
    await db.query(
        `INSERT INTO "ProjectSpace" (id, "projectId", "parentId", name, position, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [id, projectId, parentId, name, position],
    );

    revalidate(orgSlug, projectSlug);
    return { id };
}

export async function renameProjectSpace(
    orgSlug: string,
    projectSlug: string,
    spaceId: string,
    name: string,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    const trimmed = name.trim();
    if (!trimmed) return { error: "Le nom est requis" };

    await db.query(
        `UPDATE "ProjectSpace" ps
         SET name = $2, "updatedAt" = NOW()
         FROM "Project" p
         JOIN "Organization" o ON o.id = p."leadOrganizationId"
         WHERE ps.id = $1
           AND ps."projectId" = p.id
           AND p.slug = $3
           AND o.slug = $4`,
        [spaceId, trimmed, projectSlug, orgSlug],
    );

    revalidate(orgSlug, projectSlug);
    return {};
}

export async function deleteProjectSpace(
    orgSlug: string,
    projectSlug: string,
    spaceId: string,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    const check = await db.query<{ children: string; items: string }>(
        `SELECT
            (SELECT COUNT(*) FROM "ProjectSpace" WHERE "parentId" = $1)    AS children,
            (SELECT COUNT(*) FROM "WorkItem" WHERE "projectSpaceId" = $1)  AS items`,
        [spaceId],
    );
    const { children, items } = check.rows[0];
    if (parseInt(children) > 0 || parseInt(items) > 0) {
        return { error: "Videz cet espace avant de le supprimer" };
    }

    await db.query(
        `DELETE FROM "ProjectSpace" ps
         USING "Project" p, "Organization" o
         WHERE ps.id = $1
           AND ps."projectId" = p.id
           AND p.slug = $2
           AND p."leadOrganizationId" = o.id
           AND o.slug = $3`,
        [spaceId, projectSlug, orgSlug],
    );

    revalidate(orgSlug, projectSlug);
    return {};
}

export async function reorderSpaces(
    orgSlug: string,
    projectSlug: string,
    updates: { id: string; position: number; parentId: string | null }[],
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    if (!updates.length) return {};

    const projectId = await getProjectId(orgSlug, projectSlug);
    if (!projectId) return { error: "Projet introuvable" };

    await Promise.all(
        updates.map(({ id, position, parentId }) =>
            db.query(
                `UPDATE "ProjectSpace" SET position = $2, "parentId" = $3, "updatedAt" = NOW()
                 WHERE id = $1 AND "projectId" = $4`,
                [id, position, parentId, projectId],
            ),
        ),
    );

    revalidate(orgSlug, projectSlug);
    return {};
}

// ─── WorkItems ────────────────────────────────────────────

export type WorkItemFormData = {
    name: string;
    description: string;
    unit: string;
    quantity: string;
    workPackageId: string;
    // Financier — chaînes vides = non renseigné
    puEstimeHt: string;
    puSubcontractorHt: string;
    quantitySubcontractor: string;
    /** Taux décimal stocké en DB (ex : "0.30" = 30 %). "" = hérite du lot. */
    marginRate: string;
    /** "0.055" | "0.10" | "0.20" */
    tauxTva: string;
};

// Remonte l'arbre des dossiers d'un WorkItemTemplate pour trouver son WPT effectif.
async function resolveEffectiveWptFromTemplate(templateId: string): Promise<string | null> {
    const tmpl = await db.query<{ folderId: string | null }>(
        `SELECT "folderId" FROM "WorkItemTemplate" WHERE id = $1 LIMIT 1`,
        [templateId],
    );
    if (!tmpl.rows.length) return null;

    let folderId = tmpl.rows[0].folderId;
    while (folderId) {
        const folder = await db.query<{ workPackageTemplateId: string | null; parentId: string | null }>(
            `SELECT "workPackageTemplateId", "parentId" FROM "LibraryFolder" WHERE id = $1 LIMIT 1`,
            [folderId],
        );
        if (!folder.rows.length) break;
        const { workPackageTemplateId, parentId } = folder.rows[0];
        if (workPackageTemplateId) return workPackageTemplateId;
        folderId = parentId;
    }
    return null;
}

// Cherche ou crée le WorkPackage du projet correspondant à un WPT.
async function resolveOrCreateWorkPackage(projectId: string, wptId: string): Promise<string | null> {
    const existing = await db.query<{ id: string }>(
        `SELECT id FROM "WorkPackage"
         WHERE "projectId" = $1 AND "sourceWorkPackageTemplateId" = $2
         LIMIT 1`,
        [projectId, wptId],
    );
    if (existing.rows.length) return existing.rows[0].id;

    const wpt = await db.query<{ name: string; color: string | null; defaultMarginRate: string | null }>(
        `SELECT name, color::text AS color, "defaultMarginRate"::text AS "defaultMarginRate"
         FROM "WorkPackageTemplate" WHERE id = $1 LIMIT 1`,
        [wptId],
    );
    if (!wpt.rows.length) return null;
    const { name, color, defaultMarginRate } = wpt.rows[0];
    const marginRate = defaultMarginRate ? parseFloat(defaultMarginRate) : null;

    const posResult = await db.query<{ max: number }>(
        `SELECT COALESCE(MAX(position), 0) AS max FROM "WorkPackage" WHERE "projectId" = $1`,
        [projectId],
    );
    const position = (posResult.rows[0]?.max ?? 0) + 1;
    const wpId = randomUUID();

    await db.query(
        `INSERT INTO "WorkPackage"
            (id, "projectId", "sourceWorkPackageTemplateId", name, color, "marginRate", position, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5::\"LotColor\", $6, $7, NOW(), NOW())`,
        [wpId, projectId, wptId, name, color, marginRate, position],
    );
    return wpId;
}

export async function createWorkItem(
    orgSlug: string,
    projectSlug: string,
    data: WorkItemFormData & {
        spaceId?: string | null;
        templateId?: string | null;
    },
): Promise<{ error?: string; id?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    const projectId = await getProjectId(orgSlug, projectSlug);
    if (!projectId) return { error: "Projet introuvable" };

    const name = data.name.trim();
    const unit = data.unit.trim();
    if (!name) return { error: "Le nom est requis" };
    if (!unit) return { error: "L'unité est requise" };

    const quantity = parseFloat(data.quantity);
    if (isNaN(quantity) || quantity < 0) return { error: "Quantité invalide" };

    const description = data.description.trim() || null;
    const spaceId = data.spaceId ?? null;
    const templateId = data.templateId ?? null;

    const puEstimeHt = parseFloat(data.puEstimeHt) > 0 ? parseFloat(data.puEstimeHt) : null;
    const puSubcontractorHt = parseFloat(data.puSubcontractorHt) > 0 ? parseFloat(data.puSubcontractorHt) : null;
    const quantitySubcontractor = parseFloat(data.quantitySubcontractor) > 0 ? parseFloat(data.quantitySubcontractor) : null;
    const marginRate = data.marginRate ? parseFloat(data.marginRate) : null;
    const tauxTva = parseFloat(data.tauxTva) || 0.10;

    // Priorité 1 : lot sélectionné explicitement par l'utilisateur
    let workPackageId = data.workPackageId.trim() || null;

    // Priorité 2 : si import depuis template, résolution serveur du WPT effectif
    if (!workPackageId && templateId) {
        const wptId = await resolveEffectiveWptFromTemplate(templateId);
        if (wptId) {
            workPackageId = await resolveOrCreateWorkPackage(projectId, wptId);
        }
    }

    const posResult = await db.query<{ max: number }>(
        `SELECT COALESCE(MAX(position), 0) AS max
         FROM "WorkItem"
         WHERE "projectId" = $1 AND "projectSpaceId" IS NOT DISTINCT FROM $2`,
        [projectId, spaceId],
    );
    const position = (posResult.rows[0]?.max ?? 0) + 1;

    const id = randomUUID();
    await db.query(
        `INSERT INTO "WorkItem"
            (id, "projectId", "projectSpaceId", "workPackageId", "sourceWorkItemTemplateId",
             name, description, unit, quantity,
             "puEstimeHt", "puSubcontractorHt", "quantitySubcontractor", "marginRate", "tauxTva",
             status, executions, position, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'DRAFT', '[]'::jsonb, $15, NOW(), NOW())`,
        [id, projectId, spaceId, workPackageId, templateId, name, description, unit, quantity,
         puEstimeHt, puSubcontractorHt, quantitySubcontractor, marginRate, tauxTva, position],
    );

    revalidate(orgSlug, projectSlug);
    return { id };
}

export async function updateWorkItem(
    orgSlug: string,
    projectSlug: string,
    itemId: string,
    data: WorkItemFormData,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    const name = data.name.trim();
    const unit = data.unit.trim();
    if (!name) return { error: "Le nom est requis" };
    if (!unit) return { error: "L'unité est requise" };

    const quantity = parseFloat(data.quantity);
    if (isNaN(quantity) || quantity < 0) return { error: "Quantité invalide" };

    const description = data.description.trim() || null;
    const workPackageId = data.workPackageId.trim() || null;

    const puEstimeHt = parseFloat(data.puEstimeHt) > 0 ? parseFloat(data.puEstimeHt) : null;
    const puSubcontractorHt = parseFloat(data.puSubcontractorHt) > 0 ? parseFloat(data.puSubcontractorHt) : null;
    const quantitySubcontractor = parseFloat(data.quantitySubcontractor) > 0 ? parseFloat(data.quantitySubcontractor) : null;
    const marginRate = data.marginRate ? parseFloat(data.marginRate) : null;
    const tauxTva = parseFloat(data.tauxTva) || 0.10;

    await db.query(
        `UPDATE "WorkItem" wi
         SET name                    = $3,
             description             = $4,
             unit                    = $5,
             quantity                = $6,
             "workPackageId"         = $7,
             "puEstimeHt"            = $8,
             "puSubcontractorHt"     = $9,
             "quantitySubcontractor" = $10,
             "marginRate"            = $11,
             "tauxTva"               = $12,
             "updatedAt"             = NOW()
         FROM "Project" p, "Organization" o
         WHERE wi.id = $1
           AND wi."projectId" = p.id
           AND p.slug = $2
           AND p."leadOrganizationId" = o.id
           AND o.slug = $13`,
        [itemId, projectSlug, name, description, unit, quantity, workPackageId,
         puEstimeHt, puSubcontractorHt, quantitySubcontractor, marginRate, tauxTva, orgSlug],
    );

    revalidate(orgSlug, projectSlug);
    return {};
}

export async function updateWorkItemStatus(
    orgSlug: string,
    projectSlug: string,
    itemId: string,
    status: WorkItemStatus,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    await db.query(
        `UPDATE "WorkItem" wi
         SET status = $3::\"WorkItemStatus\", "updatedAt" = NOW()
         FROM "Project" p, "Organization" o
         WHERE wi.id = $1
           AND wi."projectId" = p.id
           AND p.slug = $2
           AND p."leadOrganizationId" = o.id
           AND o.slug = $4`,
        [itemId, projectSlug, status, orgSlug],
    );

    revalidate(orgSlug, projectSlug);
    return {};
}

export async function deleteWorkItem(
    orgSlug: string,
    projectSlug: string,
    itemId: string,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    await db.query(
        `DELETE FROM "WorkItem" wi
         USING "Project" p, "Organization" o
         WHERE wi.id = $1
           AND wi."projectId" = p.id
           AND p.slug = $2
           AND p."leadOrganizationId" = o.id
           AND o.slug = $3`,
        [itemId, projectSlug, orgSlug],
    );

    revalidate(orgSlug, projectSlug);
    return {};
}

export async function reorderWorkItems(
    orgSlug: string,
    projectSlug: string,
    updates: { id: string; position: number; projectSpaceId: string | null; workPackageId: string | null }[],
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    if (!updates.length) return {};

    const projectId = await getProjectId(orgSlug, projectSlug);
    if (!projectId) return { error: "Projet introuvable" };

    await Promise.all(
        updates.map(({ id, position, projectSpaceId, workPackageId }) =>
            db.query(
                `UPDATE "WorkItem"
                 SET position = $2, "projectSpaceId" = $3, "workPackageId" = $4, "updatedAt" = NOW()
                 WHERE id = $1 AND "projectId" = $5`,
                [id, position, projectSpaceId, workPackageId, projectId],
            ),
        ),
    );

    revalidate(orgSlug, projectSlug);
    return {};
}

// ─── WorkPackages ─────────────────────────────────────────

export type WorkPackageFormData = {
    name: string;
    description: string;
    color: string;
    /** Taux décimal (ex : "0.30" = 30 %). "" = pas de marge définie sur ce lot. */
    marginRate: string;
};

export async function createWorkPackage(
    orgSlug: string,
    projectSlug: string,
    data: WorkPackageFormData,
): Promise<{ error?: string; id?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    const projectId = await getProjectId(orgSlug, projectSlug);
    if (!projectId) return { error: "Projet introuvable" };

    const name = data.name.trim();
    if (!name) return { error: "Le nom est requis" };

    const description = data.description.trim() || null;
    const color = data.color.trim() || null;
    const marginRate = data.marginRate ? parseFloat(data.marginRate) : null;

    const posResult = await db.query<{ max: number }>(
        `SELECT COALESCE(MAX(position), 0) AS max FROM "WorkPackage" WHERE "projectId" = $1`,
        [projectId],
    );
    const position = (posResult.rows[0]?.max ?? 0) + 1;

    const id = randomUUID();
    await db.query(
        `INSERT INTO "WorkPackage"
            (id, "projectId", name, description, color, "marginRate", position, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5::\"LotColor\", $6, $7, NOW(), NOW())`,
        [id, projectId, name, description, color, marginRate, position],
    );

    revalidate(orgSlug, projectSlug);
    return { id };
}

export async function updateWorkPackage(
    orgSlug: string,
    projectSlug: string,
    wpId: string,
    data: WorkPackageFormData,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    const name = data.name.trim();
    if (!name) return { error: "Le nom est requis" };

    const description = data.description.trim() || null;
    const color = data.color.trim() || null;
    const marginRate = data.marginRate ? parseFloat(data.marginRate) : null;

    await db.query(
        `UPDATE "WorkPackage" wp
         SET name = $3, description = $4, color = $5::\"LotColor\", "marginRate" = $6, "updatedAt" = NOW()
         FROM "Project" p, "Organization" o
         WHERE wp.id = $1
           AND wp."projectId" = p.id
           AND p.slug = $2
           AND p."leadOrganizationId" = o.id
           AND o.slug = $7`,
        [wpId, projectSlug, name, description, color, marginRate, orgSlug],
    );

    revalidate(orgSlug, projectSlug);
    return {};
}

export async function deleteWorkPackage(
    orgSlug: string,
    projectSlug: string,
    wpId: string,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const membershipId = await getMembership(orgSlug, session.user.id);
    if (!membershipId) return { error: "Accès refusé" };

    const client = await db.connect();
    try {
        await client.query("BEGIN");
        // Désassigne les items avant de supprimer le lot
        await client.query(
            `UPDATE "WorkItem" SET "workPackageId" = NULL, "updatedAt" = NOW()
             WHERE "workPackageId" = $1`,
            [wpId],
        );
        await client.query(
            `DELETE FROM "WorkPackage" wp
             USING "Project" p, "Organization" o
             WHERE wp.id = $1
               AND wp."projectId" = p.id
               AND p.slug = $2
               AND p."leadOrganizationId" = o.id
               AND o.slug = $3`,
            [wpId, projectSlug, orgSlug],
        );
        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        return { error: "Erreur lors de la suppression du lot" };
    } finally {
        client.release();
    }

    revalidate(orgSlug, projectSlug);
    return {};
}
