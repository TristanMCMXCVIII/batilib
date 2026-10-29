# Skill : BatiLib — Server Actions

## Quand invoquer
Quand tu crées ou modifies une Server Action dans `frontend/lib/actions/`.

---

## Règles absolues

1. **Toujours vérifier la session en premier** — jamais de confiance sur un paramètre utilisateur.
2. **DB = Pool pg direct** (`frontend/lib/db.ts`), **pas Prisma** côté frontend.
3. **SQL paramétré uniquement** — jamais de template string avec des données utilisateur.
4. **Valider les inputs utilisateur avec Zod** avant de vérifier les droits (voir schémas dans `frontend/lib/validations.ts`).
5. **Vérifier le rôle avant toute mutation** sensible.
6. **`revalidatePath`** après toute mutation qui affecte une page.

---

## Pattern de base

```ts
"use server";

import { getSession } from "@/lib/session";  // helper React.cache() — toujours utiliser celui-ci
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { monActionSchema } from "@/lib/validations";  // schéma Zod dédié

export async function monAction(param: string): Promise<{ error?: string }> {
    const session = await getSession();
    if (!session) return { error: "Non authentifié" };

    // 1. Valider les inputs en premier
    const parsed = monActionSchema.safeParse({ param });
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
    }

    // 2. Vérifier le rôle si nécessaire (voir batilib-permissions)
    // const role = await getCallerRole(orgId, session.user.id);
    // if (role !== "FOUNDER") return { error: "Action réservée au fondateur" };

    await db.query(
        `UPDATE "Table" SET field = $1 WHERE id = $2`,
        [parsed.data.param, session.user.id],
    );

    revalidatePath("/chemin/de/la/page");
    return {};
}
```

## Pattern validation Zod — schémas disponibles

`frontend/lib/validations.ts` expose les schémas réutilisables. Ajouter un schéma ici plutôt qu'inline dans l'action :

| Schéma | Usage |
|--------|-------|
| `emailSchema` | Email utilisateur (format + longueur) |
| `orgNameSchema` | Nom d'organisation (1–100 car.) |
| `projectNameSchema` | Nom de projet (1–150 car.) |
| `workItemNameSchema` | Nom d'ouvrage (1–200 car.) |
| `folderNameSchema` | Nom de dossier (1–100 car.) |
| `orgInviteRoleSchema` | `"MANAGER" \| "MEMBER"` |
| `inviteMemberSchema` | Objet `{ email, role }` |
| `updateOrganizationSchema` | Objet `{ name?, description?, siret? }` |

Pour un nouveau domaine, créer le schéma dans `validations.ts` et l'importer dans l'action.

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
