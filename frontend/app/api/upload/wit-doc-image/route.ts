import { getSession } from "@/lib/session";
import { r2, R2_BUCKET } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import path from "path";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const orgSlug = formData.get("orgSlug") as string | null;
    const templateId = formData.get("templateId") as string | null;

    if (!file || !orgSlug) {
        return Response.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
        return Response.json(
            { error: "Format non supporté. Utilisez JPEG, PNG, WEBP ou GIF." },
            { status: 400 },
        );
    }

    if (file.size > MAX_SIZE) {
        return Response.json({ error: "Image trop lourde (max 10 Mo)." }, { status: 400 });
    }

    // Vérification : membre ACTIVE avec rôle FOUNDER ou MANAGER
    const access = await db.query<{ orgId: string }>(
        `SELECT o.id AS "orgId"
         FROM "OrganizationMembership" om
         JOIN "Organization" o ON o.id = om."organizationId"
         WHERE o.slug = $1
           AND om."userId" = $2
           AND om.status = 'ACTIVE'
           AND om.role IN ('FOUNDER', 'MANAGER')
         LIMIT 1`,
        [orgSlug, session.user.id],
    );
    if (!access.rows.length) {
        return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const orgId = access.rows[0].orgId;
    const ext = path.extname(file.name).toLowerCase() || `.${file.type.split("/")[1]}`;
    const uuid = randomUUID();
    const witSegment = templateId ? `/${templateId}` : "";
    const key = `wit-docs/${orgId}${witSegment}/${uuid}${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
        await r2.send(
            new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: file.type,
            }),
        );
    } catch (err) {
        console.error("[upload wit-doc-image] R2 error:", err);
        return Response.json(
            { error: "Le stockage est temporairement indisponible. Réessayez plus tard." },
            { status: 503 },
        );
    }

    return Response.json({ url: `/api/files/${key}` });
}
