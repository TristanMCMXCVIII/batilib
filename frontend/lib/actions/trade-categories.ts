"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────

export type TradeCategoryItem = {
    id: string;
    code: string;
    label: string;
    createdAt: string;
};

// ─── Guard ────────────────────────────────────────────────

async function requireAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || session.user.role !== "admin") return null;
    return session;
}

// ─── Actions ──────────────────────────────────────────────

export async function listTradeCategories(): Promise<TradeCategoryItem[]> {
    const result = await db.query<TradeCategoryItem>(
        `SELECT id, code, label, "createdAt"::text
         FROM "TradeCategory"
         ORDER BY code ASC`,
    );
    return result.rows;
}

export async function createTradeCategory(
    code: string,
    label: string,
): Promise<{ error?: string }> {
    if (!await requireAdmin()) return { error: "Non autorisé" };

    const normalized = code.trim().toUpperCase();
    const trimmedLabel = label.trim();

    if (!normalized) return { error: "Le code est requis." };
    if (!trimmedLabel) return { error: "Le libellé est requis." };

    try {
        await db.query(
            `INSERT INTO "TradeCategory" (id, code, label, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, now(), now())`,
            [normalized, trimmedLabel],
        );
        revalidatePath("/admin/utils/trade-category");
        return {};
    } catch (e: unknown) {
        if ((e as { code?: string }).code === "23505") {
            return { error: `Le code "${normalized}" existe déjà.` };
        }
        return { error: "Erreur lors de la création." };
    }
}

export async function updateTradeCategory(
    id: string,
    code: string,
    label: string,
): Promise<{ error?: string }> {
    if (!await requireAdmin()) return { error: "Non autorisé" };

    const normalized = code.trim().toUpperCase();
    const trimmedLabel = label.trim();

    if (!normalized) return { error: "Le code est requis." };
    if (!trimmedLabel) return { error: "Le libellé est requis." };

    try {
        await db.query(
            `UPDATE "TradeCategory" SET code = $1, label = $2, "updatedAt" = now() WHERE id = $3`,
            [normalized, trimmedLabel, id],
        );
        revalidatePath("/admin/utils/trade-category");
        return {};
    } catch (e: unknown) {
        if ((e as { code?: string }).code === "23505") {
            return { error: `Le code "${normalized}" existe déjà.` };
        }
        return { error: "Erreur lors de la modification." };
    }
}

export async function deleteTradeCategory(id: string): Promise<{ error?: string }> {
    if (!await requireAdmin()) return { error: "Non autorisé" };

    const client = await db.connect();
    try {
        await client.query("BEGIN");
        // Nullifier les FK optionnelles avant suppression
        await client.query(
            `UPDATE "WorkItem" SET "tradeCategoryId" = NULL WHERE "tradeCategoryId" = $1`,
            [id],
        );
        await client.query(
            `UPDATE "WorkItemTemplate" SET "tradeCategoryId" = NULL WHERE "tradeCategoryId" = $1`,
            [id],
        );
        await client.query(
            `UPDATE "WorkPackageTemplate" SET "tradeCategoryId" = NULL WHERE "tradeCategoryId" = $1`,
            [id],
        );
        await client.query(`DELETE FROM "TradeCategory" WHERE id = $1`, [id]);
        await client.query("COMMIT");
        revalidatePath("/admin/utils/trade-category");
        return {};
    } catch {
        await client.query("ROLLBACK");
        return { error: "Erreur lors de la suppression." };
    } finally {
        client.release();
    }
}
