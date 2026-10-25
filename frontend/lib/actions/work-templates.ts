"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────

export type OrgRole = "FOUNDER" | "MANAGER" | "MEMBER";

export type WorkTemplateItem = {
    id: string;
    name: string;
    description: string | null;
    unit: string;
    defaultUnitPrice: string | null;
    estimatedUnitCost: string | null;
    defaultTaxRate: string | null;
    createdAt: string;
    updatedAt: string;
};

export type WorkTemplateFormData = {
    name: string;
    description: string;
    unit: string;
    defaultUnitPrice: string;
    estimatedUnitCost: string;
    defaultTaxRate: string;
};

// ─── Helper ───────────────────────────────────────────────

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

export async function getWorkTemplates(
    orgSlug: string,
): Promise<{ templates: WorkTemplateItem[]; callerRole: OrgRole | null }> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return { templates: [], callerRole: null };

    const callerRole = await getCallerRole(orgSlug, session.user.id);
    if (!callerRole) return { templates: [], callerRole: null };

    const result = await db.query<WorkTemplateItem>(
        `SELECT
            wt.id,
            wt.name,
            wt.description,
            wt.unit,
            ROUND(wt."defaultUnitPrice", 2)::text   AS "defaultUnitPrice",
            ROUND(wt."estimatedUnitCost", 2)::text  AS "estimatedUnitCost",
            ROUND(wt."defaultTaxRate", 1)::text     AS "defaultTaxRate",
            wt."createdAt"::text                    AS "createdAt",
            wt."updatedAt"::text                    AS "updatedAt"
         FROM "WorkTemplate" wt
         JOIN "Organization" o ON o.id = wt."organizationId"
         WHERE o.slug = $1
         ORDER BY wt."createdAt" DESC`,
        [orgSlug],
    );

    return { templates: result.rows, callerRole };
}

export async function createWorkTemplate(
    orgSlug: string,
    data: WorkTemplateFormData,
): Promise<{ error?: string; id?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
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

    const id = randomUUID();

    const result = await db.query<{ id: string }>(
        `INSERT INTO "WorkTemplate"
            (id, "organizationId", name, description, unit, "defaultUnitPrice", "estimatedUnitCost", "defaultTaxRate", "defaultChecklist", "createdAt", "updatedAt")
         SELECT $1, o.id, $3, $4, $5, $6, $7, $8, '[]'::jsonb, NOW(), NOW()
         FROM "Organization" o
         WHERE o.slug = $2
         RETURNING id`,
        [id, orgSlug, name, description, unit, defaultUnitPrice, estimatedUnitCost, defaultTaxRate],
    );

    if (!result.rows.length) return { error: "Organisation introuvable" };

    revalidatePath(`/${orgSlug}/library/work-items`);
    return { id: result.rows[0].id };
}

export async function updateWorkTemplate(
    orgSlug: string,
    templateId: string,
    data: WorkTemplateFormData,
): Promise<{ error?: string }> {
    const session = await auth.api.getSession({ headers: await headers() });
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
        `UPDATE "WorkTemplate" wt
         SET name               = $3,
             description        = $4,
             unit               = $5,
             "defaultUnitPrice" = $6,
             "estimatedUnitCost"= $7,
             "defaultTaxRate"   = $8,
             "updatedAt"        = NOW()
         FROM "Organization" o
         WHERE wt.id = $1
           AND o.slug = $2
           AND wt."organizationId" = o.id`,
        [templateId, orgSlug, name, description, unit, defaultUnitPrice, estimatedUnitCost, defaultTaxRate],
    );

    revalidatePath(`/${orgSlug}/library/work-items`);
    return {};
}
