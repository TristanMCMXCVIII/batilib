# Skill : BatiLib — Server Actions

## Quand invoquer
Quand tu crées ou modifies une Server Action dans `frontend/lib/actions/`.

---

## Règles absolues

1. **Toujours vérifier la session en premier** — jamais de confiance sur un paramètre utilisateur.
2. **DB = Pool pg direct** (`frontend/lib/db.ts`), **pas Prisma** côté frontend.
3. **SQL paramétré uniquement** — jamais de template string avec des données utilisateur.
4. **Vérifier le rôle avant toute mutation** sensible.
5. **`revalidatePath`** après toute mutation qui affecte une page.

---

## Pattern de base

```ts
"use server";

import { getSession } from "@/lib/session";  // helper React.cache() — toujours utiliser celui-ci
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function monAction(param: string): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    // Vérifier le rôle si nécessaire (voir batilib-permissions)
    // const role = await getCallerRole(orgId, session.user.id);
    // if (role !== "FOUNDER") return { error: "Action réservée au fondateur" };

    await db.query(
        `UPDATE "Table" SET field = $1 WHERE id = $2`,
        [param, session.user.id],
    );

    revalidatePath("/chemin/de/la/page");
    return {};
}
```

## Pattern transaction atomique

```ts
const client = await db.connect();
try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO ...`, [...]);
    await client.query(`UPDATE ...`, [...]);
    await client.query("COMMIT");
} catch (err) {
    await client.query("ROLLBACK");
    throw err;
} finally {
    client.release();
}
```

## Pattern query avec retour typé

```ts
type MyRow = { id: string; name: string };

const result = await db.query<MyRow>(
    `SELECT id, name FROM "Table" WHERE "userId" = $1 AND status = 'ACTIVE'`,
    [session.user.id],
);
return result.rows; // MyRow[]
```

---

## Conventions

- Fichiers dans `frontend/lib/actions/` — un fichier par domaine (`organization.ts`, `organization-settings.ts`, futur `project.ts`...)
- Retour des mutations : `{ error?: string }` ou `{ data: T; error?: string }`
- Retour des queries : tableau typé ou `null` si non trouvé
- Noms de tables PostgreSQL en `"PascalCase"` avec guillemets doubles
- Colonnes camelCase entre guillemets : `"createdAt"`, `"userId"`, `"organizationId"`
- IDs générés avec `gen_random_uuid()::text` (pas `cuid` côté SQL)
