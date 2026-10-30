import { getSession } from "@/lib/session";
import { r2, R2_BUCKET } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import path from "path";

// Extensions exécutables bloquées pour des raisons de sécurité
const BLOCKED_EXTENSIONS = new Set([
    ".exe", ".msi", ".bat", ".cmd", ".com", ".ps1", ".vbs", ".wsf", ".scr", ".pif", ".reg",
    ".sh", ".bash", ".zsh", ".csh", ".ksh", ".fish",
    ".app", ".dmg", ".pkg", ".command", ".workflow",
    ".dll", ".so", ".dylib", ".lib",
    ".jar", ".class", ".war", ".ear",
    ".apk", ".ipa",
]);

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const orgSlug = formData.get("orgSlug") as string | null;
    const projectSlug = formData.get("projectSlug") as string | null;

    if (!file || !orgSlug || !projectSlug) {
        return Response.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Vérification de l'extension
    const ext = path.extname(file.name).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
        return Response.json(
            { error: "Ce type de fichier n'est pas autorisé pour des raisons de sécurité." },
            { status: 400 },
        );
    }

    // Vérification que l'utilisateur est bien membre ACTIVE de l'org ET participant au projet
    const accessCheck = await db.query<{ orgId: string }>(
        `SELECT o.id AS "orgId"
         FROM "OrganizationMembership" om
         JOIN "Organization" o ON o.id = om."organizationId"
         JOIN "Project" p ON p."leadOrganizationId" = o.id OR EXISTS (
             SELECT 1 FROM "ProjectParticipant" pp2
             WHERE pp2."projectId" = p.id AND pp2."organizationId" = o.id
         )
         WHERE o.slug = $1 AND p.slug = $2 AND om."userId" = $3 AND om.status = 'ACTIVE'
         LIMIT 1`,
        [orgSlug, projectSlug, session.user.id],
    );
    if (!accessCheck.rows.length) {
        return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const orgId = accessCheck.rows[0].orgId;
    const projectResult = await db.query<{ id: string }>(
        `SELECT p.id FROM "Project" p
         JOIN "ProjectParticipant" pp ON pp."projectId" = p.id
         WHERE p.slug = $1 AND pp."organizationId" = $2
         LIMIT 1`,
        [projectSlug, orgId],
    );
    if (!projectResult.rows.length) {
        return Response.json({ error: "Projet introuvable" }, { status: 404 });
    }
    const projectId = projectResult.rows[0].id;

    const uuid = randomUUID();
    const safeExt = ext || "";
    const key = `documents/${orgId}/${projectId}/${uuid}${safeExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
        await r2.send(
            new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: file.type || "application/octet-stream",
                ContentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
            }),
        );
    } catch (err) {
        console.error("[upload project-document] R2 error:", err);
        return Response.json(
            { error: "Le stockage est temporairement indisponible. Réessayez plus tard." },
            { status: 503 },
        );
    }

    return Response.json({
        fileKey: key,
        sizeBytes: file.size,
        mimeType: file.type || "application/octet-stream",
    });
}
