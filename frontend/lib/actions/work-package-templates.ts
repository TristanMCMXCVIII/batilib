"use server";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────

export type OrgRole = "FOUNDER" | "MANAGER" | "MEMBER";

export type TradeCategoryItem = {
    id: string;
    code: string;
    label: string;
};

export type WorkPackageTemplateItem = {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    defaultMarginRate: string | null;
    tradeCategoryId: string | null;
    tradeCategoryLabel: string | null;
    position: number;
    createdAt: string;
    updatedAt: string;
};

export type WorkPackageTemplateFormData = {
    name: string;
    description: string;
    defaultMarginRate: string;
    tradeCategoryId: string;
    color: string;
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

// ─── Actions ──────────────────────────────────────────────

export async function getWorkPackageTemplates(orgSlug: string): Promise<{
    templates: WorkPackageTemplateItem[];
    tradeCategories: TradeCategoryItem[];
    callerRole: OrgRole | null;
}> {
    const session = await getSession();
    if (!session) return { templates: [], tradeCategories: [], callerRole: null };

    const callerRole = await getCallerRole(orgSlug, session.user.id);
    if (!callerRole) return { templates: [], tradeCategories: [], callerRole: null };

    const [templatesResult, categoriesResult] = await Promise.all([
        db.query<WorkPackageTemplateItem>(
            `SELECT
                wpt.id,
                wpt.name,
                wpt.description,
                wpt.color::text                         AS "color",
                ROUND(wpt."defaultMarginRate", 2)::text AS "defaultMarginRate",
                wpt."tradeCategoryId",
                tc.label                                AS "tradeCategoryLabel",
                wpt.position,
                wpt."createdAt"::text                   AS "createdAt",
                wpt."updatedAt"::text                   AS "updatedAt"
             FROM "WorkPackageTemplate" wpt
             JOIN "Organization" o ON o.id = wpt."organizationId"
             LEFT JOIN "TradeCategory" tc ON tc.id = wpt."tradeCategoryId"
             WHERE o.slug = $1
             ORDER BY wpt.position ASC, wpt."createdAt" DESC`,
            [orgSlug],
        ),
        db.query<TradeCategoryItem>(
            `SELECT id, code, label FROM "TradeCategory" ORDER BY label ASC`,
        ),
    ]);

    return {
        templates: templatesResult.rows,
        tradeCategories: categoriesResult.rows,
        callerRole,
    };
}

export async function createWorkPackageTemplate(
    orgSlug: string,
    data: WorkPackageTemplateFormData,
): Promise<{ error?: string; id?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER" && role !== "MANAGER") return { error: "Permissions insuffisantes" };

    const name = data.name.trim();
    if (!name) return { error: "Le nom est requis" };

    const description = data.description.trim() || null;
    const defaultMarginRate = parseDecimal(data.defaultMarginRate);
    const tradeCategoryId = data.tradeCategoryId.trim() || null;
    const color = data.color.trim() || null;

    if (data.defaultMarginRate.trim() && defaultMarginRate === null)
        return { error: "Taux de marge invalide" };

    const id = randomUUID();

    const result = await db.query<{ id: string }>(
        `INSERT INTO "WorkPackageTemplate"
            (id, "organizationId", name, description, color, "defaultMarginRate", "tradeCategoryId", position, "createdAt", "updatedAt")
         SELECT $1, o.id, $3, $4, $5::\"LotColor\", $6, $7,
                COALESCE((SELECT MAX(position) + 1 FROM "WorkPackageTemplate" WHERE "organizationId" = o.id), 0),
                NOW(), NOW()
         FROM "Organization" o
         WHERE o.slug = $2
         RETURNING id`,
        [id, orgSlug, name, description, color, defaultMarginRate, tradeCategoryId],
    );

    if (!result.rows.length) return { error: "Organisation introuvable" };

    revalidatePath(`/${orgSlug}/library/work-packages`);
    return { id: result.rows[0].id };
}

export async function updateWorkPackageTemplate(
    orgSlug: string,
    templateId: string,
    data: WorkPackageTemplateFormData,
): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    const role = await getCallerRole(orgSlug, session.user.id);
    if (role !== "FOUNDER" && role !== "MANAGER") return { error: "Permissions insuffisantes" };

    const name = data.name.trim();
    if (!name) return { error: "Le nom est requis" };

    const description = data.description.trim() || null;
    const defaultMarginRate = parseDecimal(data.defaultMarginRate);
    const tradeCategoryId = data.tradeCategoryId.trim() || null;
    const color = data.color.trim() || null;

    if (data.defaultMarginRate.trim() && defaultMarginRate === null)
        return { error: "Taux de marge invalide" };

    await db.query(
        `UPDATE "WorkPackageTemplate" wpt
         SET name                 = $3,
             description          = $4,
             color                = $5::\"LotColor\",
             "defaultMarginRate"  = $6,
             "tradeCategoryId"    = $7,
             "updatedAt"          = NOW()
         FROM "Organization" o
         WHERE wpt.id = $1
           AND o.slug = $2
           AND wpt."organizationId" = o.id`,
        [templateId, orgSlug, name, description, color, defaultMarginRate, tradeCategoryId],
    );

    revalidatePath(`/${orgSlug}/library/work-packages`);
    return {};
}
