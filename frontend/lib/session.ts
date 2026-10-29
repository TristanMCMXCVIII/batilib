import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Cached per-request session lookup.
 * React deduplicates calls within the same render tree (layouts, pages, server actions).
 */
export const getSession = cache(async () => {
    return auth.api.getSession({ headers: await headers() });
});
