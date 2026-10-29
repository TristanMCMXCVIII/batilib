"use server";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────

export type OrgRole = "FOUNDER" | "MANAGER" | "MEMBER";

export type WorkPackageTemplateRef = {
    id: string;
    name: string;
    color: string | null;
};

export type WorkItemTemplateItem = {
    id: string;
    folderId: string | null;
    name: string;
    description: string | null;
    unit: string;
    defaultUnitPrice: string | null;
    estimatedUnitCost: string | null;
    defaultTaxRate: string | null;
    position: number;
    createdAt: string;
    updatedAt: string;
};

export type LibraryFolderRaw = {
    id: string;
    parentId: string | null;
    workPackageTemplateId: string | null;
    workPackageTemplateName: string | null;
    workPackageTemplateColor: string | null;
    name: string;
    position: number;
};

// Dossier enrichi avec WPT effectif résolu depuis les ancêtres
export type LibraryFolderItem = LibraryFolderRaw & {
    effectiveWptId: string | null;
    effectiveWptName: string | null;
    effectiveWptColor: string | null;
    children: LibraryFolderItem[];
    items: WorkItemTemplateItem[];
};

export type LibraryTree = {
    folders: LibraryFolderItem[];   // dossiers racine (parentId = null)
    rootItems: WorkItemTemplateItem[]; // ouvrages sans dossier
};

export type WorkItemTemplateFormData = {
    name: string;
    description: string;
    unit: string;
    defaultUnitPrice: string;
    estimatedUnitCost: string;
    defaultTaxRate: string;
};

// ─── Helpers ──────────────────────────────────────────────

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

function parseDecimal(value: string): number | null {
    if (!value.trim()) return null;
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
}

// Résout le WPT effectif d'un dossier en remontant l'arbre en mémoire
function resolveEffectiveWpt(
    folderId: string | null,
    folderMap: Map<string, LibraryFolderRaw>,
): { id: string; name: string; color: string | null } | null {
    let current = folderId ? folderMap.get(folderId) ?? null : null;
    while (current) {
        if (current.workPackageTemplateId && current.workPackageTemplateName) {
            return { id: current.workPackageTemplateId, name: current.workPackageTemplateName, color: current.workPackageTemplateColor ?? null };
        }
        current = current.parentId ? folderMap.get(current.parentId) ?? null : null;
    }
    return null;
}

// Construit l'arbre de dossiers enrichis avec items et WPT effectif
function buildTree(
    folders: LibraryFolderRaw[],
    items: WorkItemTemplateItem[],
): LibraryTree {
    const folderMap = new Map<string, LibraryFolderRaw>(folders.map((f) => [f.id, f]));
    const itemsByFolder = new Map<string | null, WorkItemTemplateItem[]>();

    for (const item of items) {
        const key = item.folderId;
        if (!itemsByFolder.has(key)) itemsByFolder.set(key, []);
        itemsByFolder.get(key)!.push(item);
    }

    function buildFolder(raw: LibraryFolderRaw): LibraryFolderItem {
        const effective = resolveEffectiveWpt(raw.id, folderMap);
        return {
            ...raw,
            effectiveWptId: effective?.id ?? null,
            effectiveWptName: effective?.name ?? null,
            effectiveWptColor: effective?.color ?? null,
            children: folders
                .filter((f) => f.parentId === raw.id)
                .sort((a, b) => a.position - b.position)
                .map(buildFolder),
            items: itemsByFolder.get(raw.id) ?? [],
        };
    }

    const rootFolders = folders
        .filter((f) => f.parentId === null)
        .sort((a, b) => a.position - b.position)
        .map(buildFolder);

    return {
        folders: rootFolders,
        rootItems: itemsByFolder.get(null) ?? [],
    };
}

// ─── Actions lecture ───────────────────────────────────────

export async function getLibraryTree(orgSlug: string): Promise<{
    tree: LibraryTree;
    callerRole: OrgRole | null;
    workPackageTemplates: WorkPackageTemplateRef[];
}> {
    const session = await getSession();
    if (!session) return { tree: { folders: [], rootItems: [] }, callerRole: null, workPackageTemplates: [] };

    const callerRole = await getCallerRole(orgSlug, session.user.id);
    if (!callerRole) return { tree: { folders: [], rootItems: [] }, callerRole: null, workPackageTemplates: [] };

    const [foldersResult, itemsResult, wptResult] = await Promise.all([
        db.query<LibraryFolderRaw>(
            `SELECT
                lf.id,
                lf."parentId",
                lf."workPackageTemplateId",
                wpt.name                AS "workPackageTemplateName",
                wpt.color::text         AS "workPackageTemplateColor",
                lf.name,
                lf.position
             FROM "LibraryFolder" lf
             JOIN "Organization" o ON o.id = lf."organizationId"
             LEFT JOIN "WorkPackageTemplate" wpt ON wpt.id = lf."workPackageTemplateId"
             WHERE o.slug = $1
             ORDER BY lf.position ASC, lf.name ASC`,
            [orgSlug],
        ),
        db.query<WorkItemTemplateItem>(
            `SELECT
                wit.id,
                wit."folderId",
                wit.name,
                wit.description,
                wit.unit,
                ROUND(wit."defaultUnitPrice", 2)::text  AS "defaultUnitPrice",
                ROUND(wit."estimatedUnitCost", 2)::text AS "estimatedUnitCost",
                ROUND(wit."defaultTaxRate", 1)::text    AS "defaultTaxRate",
                wit.position,
                wit."createdAt"::text                   AS "createdAt",
                wit."updatedAt"::text                   AS "updatedAt"
             FROM "WorkItemTemplate" wit
             JOIN "Organization" o ON o.id = wit."organizationId"
             WHERE o.slug = $1
             ORDER BY wit.position ASC, wit."createdAt" ASC`,
            [orgSlug],
        ),
        db.query<WorkPackageTemplateRef>(
            `SELECT wpt.id, wpt.name, wpt.color::text AS color
             FROM "WorkPackageTemplate" wpt
             JOIN "Organization" o ON o.id = wpt."organizationId"
             WHERE o.slug = $1
             ORDER BY wpt.position ASC, wpt.name ASC`,
            [orgSlug],
        ),
    ]);

    const tree = buildTree(foldersResult.rows, itemsResult.rows);
    return { tree, callerRole, workPackageTemplates: wptResult.rows };
}

// ─── Actions WorkItemTemplate ──────────────────────────────

export async function createWorkItemTemplate(
    orgSlug: string,
    data: WorkItemTemplateFormData,
    folderId?: string | null,
): Promise<{ error?: string; id?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER" && role !== "MANAGER") return { error: "Permissions insuffisantes" };

    const name = data.name.trim();
    const unit = data.unit.trim();
    if (!name) return { error: "Le nom est requis" };
    if (!unit) return { error: "L'unité est requise" };

    const description = data.description.trim() || null;
    const defaultUnitPrice = parseDecimal(data.defaultUnitPrice);
    const estimatedUnitCost = parseDecimal(data.estimatedUnitCost);
    const defaultTaxRate = parseDecimal(data.defaultTaxRate);
    const resolvedFolderId = folderId ?? null;

    if (data.defaultUnitPrice.trim() && defaultUnitPrice === null) return { error: "Prix unitaire invalide" };
    if (data.estimatedUnitCost.trim() && estimatedUnitCost === null) return { error: "Coût unitaire invalide" };
    if (data.defaultTaxRate.trim() && defaultTaxRate === null) return { error: "Taux de TVA invalide" };

    const id = randomUUID();

    const result = await db.query<{ id: string }>(
        `INSERT INTO "WorkItemTemplate"
            (id, "organizationId", "folderId", name, description, unit, "defaultUnitPrice", "estimatedUnitCost", "defaultTaxRate", "defaultChecklist", "createdAt", "updatedAt")
         SELECT $1, o.id, $3, $4, $5, $6, $7, $8, $9, '[]'::jsonb, NOW(), NOW()
         FROM "Organization" o
         WHERE o.slug = $2
         RETURNING id`,
        [id, orgSlug, resolvedFolderId, name, description, unit, defaultUnitPrice, estimatedUnitCost, defaultTaxRate],
    );

    if (!result.rows.length) return { error: "Organisation introuvable" };

    revalidatePath(`/${orgSlug}/library/work-items`);
    return { id: result.rows[0].id };
}

export async function updateWorkItemTemplate(
    orgSlug: string,
    templateId: string,
    data: WorkItemTemplateFormData,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER" && role !== "MANAGER") return { error: "Permissions insuffisantes" };

    const name = data.name.trim();
    const unit = data.unit.trim();
    if (!name) return { error: "Le nom est requis" };
    if (!unit) return { error: "L'unité est requise" };

    const description = data.description.trim() || null;
    const defaultUnitPrice = parseDecimal(data.defaultUnitPrice);
    const estimatedUnitCost = parseDecimal(data.estimatedUnitCost);
    const defaultTaxRate = parseDecimal(data.defaultTaxRate);

    if (data.defaultUnitPrice.trim() && defaultUnitPrice === null) return { error: "Prix unitaire invalide" };
    if (data.estimatedUnitCost.trim() && estimatedUnitCost === null) return { error: "Coût unitaire invalide" };
    if (data.defaultTaxRate.trim() && defaultTaxRate === null) return { error: "Taux de TVA invalide" };

    await db.query(
        `UPDATE "WorkItemTemplate" wit
         SET name                = $3,
             description         = $4,
             unit                = $5,
             "defaultUnitPrice"  = $6,
             "estimatedUnitCost" = $7,
             "defaultTaxRate"    = $8,
             "updatedAt"         = NOW()
         FROM "Organization" o
         WHERE wit.id = $1
           AND o.slug = $2
           AND wit."organizationId" = o.id`,
        [templateId, orgSlug, name, description, unit, defaultUnitPrice, estimatedUnitCost, defaultTaxRate],
    );

    revalidatePath(`/${orgSlug}/library/work-items`);
    return {};
}

export async function deleteWorkItemTemplate(
    orgSlug: string,
    templateId: string,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER" && role !== "MANAGER") return { error: "Permissions insuffisantes" };

    await db.query(
        `DELETE FROM "WorkItemTemplate" wit
         USING "Organization" o
         WHERE wit.id = $1
           AND o.slug = $2
           AND wit."organizationId" = o.id`,
        [templateId, orgSlug],
    );

    revalidatePath(`/${orgSlug}/library/work-items`);
    return {};
}

// ─── Actions LibraryFolder ─────────────────────────────────

export async function createFolder(
    orgSlug: string,
    data: { name: string; parentId: string | null },
): Promise<{ error?: string; id?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER" && role !== "MANAGER") return { error: "Permissions insuffisantes" };

    const name = data.name.trim();
    if (!name) return { error: "Le nom est requis" };

    const id = randomUUID();

    // Position = max existant + 1 au même niveau
    const posResult = await db.query<{ max: number }>(
        `SELECT COALESCE(MAX(lf.position), 0) AS max
         FROM "LibraryFolder" lf
         JOIN "Organization" o ON o.id = lf."organizationId"
         WHERE o.slug = $1
           AND lf."parentId" IS NOT DISTINCT FROM $2`,
        [orgSlug, data.parentId],
    );
    const position = (posResult.rows[0]?.max ?? 0) + 1;

    const result = await db.query<{ id: string }>(
        `INSERT INTO "LibraryFolder"
            (id, "organizationId", "parentId", name, position, "createdAt", "updatedAt")
         SELECT $1, o.id, $3, $4, $5, NOW(), NOW()
         FROM "Organization" o
         WHERE o.slug = $2
         RETURNING id`,
        [id, orgSlug, data.parentId, name, position],
    );

    if (!result.rows.length) return { error: "Organisation introuvable" };

    revalidatePath(`/${orgSlug}/library/work-items`);
    return { id: result.rows[0].id };
}

export async function renameFolder(
    orgSlug: string,
    folderId: string,
    name: string,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER" && role !== "MANAGER") return { error: "Permissions insuffisantes" };

    const trimmed = name.trim();
    if (!trimmed) return { error: "Le nom est requis" };

    await db.query(
        `UPDATE "LibraryFolder" lf
         SET name = $3, "updatedAt" = NOW()
         FROM "Organization" o
         WHERE lf.id = $1
           AND o.slug = $2
           AND lf."organizationId" = o.id`,
        [folderId, orgSlug, trimmed],
    );

    revalidatePath(`/${orgSlug}/library/work-items`);
    return {};
}

export async function setFolderWpt(
    orgSlug: string,
    folderId: string,
    workPackageTemplateId: string | null,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER" && role !== "MANAGER") return { error: "Permissions insuffisantes" };

    await db.query(
        `UPDATE "LibraryFolder" lf
         SET "workPackageTemplateId" = $3, "updatedAt" = NOW()
         FROM "Organization" o
         WHERE lf.id = $1
           AND o.slug = $2
           AND lf."organizationId" = o.id`,
        [folderId, orgSlug, workPackageTemplateId],
    );

    revalidatePath(`/${orgSlug}/library/work-items`);
    return {};
}

export async function reorderItems(
    orgSlug: string,
    updates: { id: string; folderId: string | null; position: number }[],
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER" && role !== "MANAGER") return { error: "Permissions insuffisantes" };

    if (updates.length === 0) return {};

    // Résolution de l'orgId une seule fois
    const orgResult = await db.query<{ id: string }>(
        `SELECT id FROM "Organization" WHERE slug = $1 LIMIT 1`,
        [orgSlug],
    );
    if (!orgResult.rows.length) return { error: "Organisation introuvable" };
    const orgId = orgResult.rows[0].id;

    await Promise.all(
        updates.map(({ id, folderId, position }) =>
            db.query(
                `UPDATE "WorkItemTemplate"
                 SET "folderId" = $2, position = $3, "updatedAt" = NOW()
                 WHERE id = $1 AND "organizationId" = $4`,
                [id, folderId, position, orgId],
            ),
        ),
    );

    revalidatePath(`/${orgSlug}/library/work-items`);
    return {};
}

export async function reorderFolders(
    orgSlug: string,
    updates: { id: string; position: number }[],
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER" && role !== "MANAGER") return { error: "Permissions insuffisantes" };

    if (updates.length === 0) return {};

    const orgResult = await db.query<{ id: string }>(
        `SELECT id FROM "Organization" WHERE slug = $1 LIMIT 1`,
        [orgSlug],
    );
    if (!orgResult.rows.length) return { error: "Organisation introuvable" };
    const orgId = orgResult.rows[0].id;

    await Promise.all(
        updates.map(({ id, position }) =>
            db.query(
                `UPDATE "LibraryFolder"
                 SET position = $2, "updatedAt" = NOW()
                 WHERE id = $1 AND "organizationId" = $3`,
                [id, position, orgId],
            ),
        ),
    );

    revalidatePath(`/${orgSlug}/library/work-items`);
    return {};
}

export async function deleteFolder(
    orgSlug: string,
    folderId: string,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER" && role !== "MANAGER") return { error: "Permissions insuffisantes" };

    const checkResult = await db.query<{ subfolders: string; items: string }>(
        `SELECT
            (SELECT COUNT(*) FROM "LibraryFolder" WHERE "parentId" = $1)      AS subfolders,
            (SELECT COUNT(*) FROM "WorkItemTemplate" WHERE "folderId" = $1)   AS items`,
        [folderId],
    );
    const { subfolders, items } = checkResult.rows[0];
    if (parseInt(subfolders) > 0 || parseInt(items) > 0) {
        return { error: "Videz ce dossier avant de le supprimer" };
    }

    await db.query(
        `DELETE FROM "LibraryFolder" lf
         USING "Organization" o
         WHERE lf.id = $1
           AND o.slug = $2
           AND lf."organizationId" = o.id`,
        [folderId, orgSlug],
    );

    revalidatePath(`/${orgSlug}/library/work-items`);
    return {};
}
