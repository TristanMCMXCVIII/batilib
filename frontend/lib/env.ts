import { z } from "zod";

const schema = z.object({
    BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET est requis"),
    BETTER_AUTH_URL:    z.string().url("BETTER_AUTH_URL doit être une URL valide"),
    DATABASE_URL:       z.string().min(1, "DATABASE_URL est requis"),
    GOOGLE_CLIENT_ID:   z.string().min(1, "GOOGLE_CLIENT_ID est requis"),
    GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET est requis"),
    BREVO_API_KEY:      z.string().min(1, "BREVO_API_KEY est requis"),
    BREVO_SENDER_NAME:  z.string().min(1, "BREVO_SENDER_NAME est requis"),
    BREVO_SENDER_EMAIL: z.string().email("BREVO_SENDER_EMAIL doit être un email valide"),
    R2_ENDPOINT:        z.string().url("R2_ENDPOINT doit être une URL valide"),
    R2_REGION:          z.string().default("auto"),
    R2_ACCESS_KEY_ID:   z.string().min(1, "R2_ACCESS_KEY_ID est requis"),
    R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY est requis"),
    R2_BUCKET_NAME:     z.string().min(1, "R2_BUCKET_NAME est requis"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    const errors = parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n");
    throw new Error(`Variables d'environnement invalides:\n${errors}`);
}

export const env = parsed.data;
