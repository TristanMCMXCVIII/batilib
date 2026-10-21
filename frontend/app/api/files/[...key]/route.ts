import { r2, R2_BUCKET } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ key: string[] }> }
) {
    const { key } = await params;
    const r2Key = key.join("/");

    // Avatars : accès public intentionnel (photo de profil = info publique)
    // Pour les futurs fichiers sensibles (factures, docs projet) :
    //   ajouter ici une vérification de session + droits avant de générer l'URL

    const url = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: R2_BUCKET, Key: r2Key }),
        { expiresIn: 3600 }
    );

    return Response.redirect(url, 302);
}
