import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

export const r2 = new S3Client({
    region: env.R2_REGION,
    endpoint: env.R2_ENDPOINT,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
});

export const R2_BUCKET = env.R2_BUCKET_NAME;
