import { auth } from "@/lib/auth";
import { r2, R2_BUCKET } from "@/lib/r2";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { headers } from "next/headers";

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
        return Response.json({ error: "Fichier manquant" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        return Response.json(
            { error: "Format non supporté (jpeg, png, webp uniquement)" },
            { status: 400 }
        );
    }
    if (file.size > MAX_SIZE) {
        return Response.json(
            { error: "Fichier trop lourd (max 5 Mo)" },
            { status: 400 }
        );
    }

    // Suppression de l'ancien avatar si stocké dans R2
    const oldImage = session.user.image;
    if (oldImage?.startsWith("/api/files/")) {
        const oldKey = oldImage.slice("/api/files/".length);
        await r2
            .send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }))
            .catch(() => {
                // Pas bloquant si l'ancien fichier n'existe plus
            });
    }

    const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
    const key = `avatars/${session.user.id}/${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    try {
        await r2.send(
            new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: file.type,
            })
        );
    } catch (err) {
        console.error("[upload avatar] R2 error:", err);
        return Response.json(
            { error: "Le stockage est temporairement indisponible. Réessayez plus tard." },
            { status: 503 }
        );
    }

    return Response.json({ url: `/api/files/${key}` });
}
