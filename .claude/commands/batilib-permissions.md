# Skill : BatiLib — Permissions

## Quand invoquer
Quand tu travailles sur une fonctionnalité qui implique des contrôles d'accès : organisations, projets, membres, invitations, données financières.

---

## Les deux couches de permissions — NE PAS CONFONDRE

### 1. Rôle plateforme (Better Auth)
Qui peut administrer le SaaS entier.

| Rôle | Accès |
|------|-------|
| `user` | utilisateur standard |
| `admin` | administration plateforme (`/admin`) |

Stocké sur `User.role`. Modifiable uniquement par un admin via `auth.api`. Jamais par l'utilisateur lui-même.

### 2. Rôle organisation (métier)
Qui peut faire quoi dans une organisation.

| Rôle | Capacités |
|------|-----------|
| `FOUNDER` | tout : modifier l'org, inviter, changer les rôles, retirer des membres, transférer le rôle fondateur |
| `MANAGER` | (à définir selon besoins — actuellement pas de capacités différenciées implémentées) |
| `MEMBER` | lecture, actions de base |

Stocké sur `OrganizationMembership.role`. Vérification via `getCallerRole()`.

### 3. Rôle projet (à venir)
Qui peut faire quoi sur un projet spécifique. Non encore implémenté.
Anticiper : `OWNER` (org pilote), `COLLABORATOR` (salarié), `SUBCONTRACTOR` (org sous-traitante), `CLIENT` (org cliente).

---

## Pattern de vérification — Organisation

```ts
// Helper existant dans frontend/lib/actions/organization-settings.ts
async function getCallerRole(orgId: string, userId: string): Promise<OrgRole | null> {
    const result = await db.query<{ role: OrgRole }>(
        `SELECT role FROM "OrganizationMembership"
         WHERE "organizationId" = $1 AND "userId" = $2 AND status = 'ACTIVE'
         LIMIT 1`,
        [orgId, userId],
    );
    return result.rows[0]?.role ?? null;
}

// Usage dans une Server Action
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return { error: "Non authentifié" };

const role = await getCallerRole(orgId, session.user.id);
if (!role) return { error: "Vous n'êtes pas membre de cette organisation" };
if (role !== "FOUNDER") return { error: "Action réservée au fondateur" };
```

---

## Rôles Organisation dans le contexte métier (futur)

Une organisation a un **type** (`OrganizationKind`) qui détermine son rôle dans un projet :

| Kind | Rôle dans un projet |
|------|---------------------|
| `BUILDING_COMPANY` | Pilote / contractant général — voit les coûts, marges, coordonne |
| `CLIENT_COMPANY` | Client entreprise — voit les devis/factures HT, pas les marges internes |
| `INDIVIDUAL_CLIENT` | Client particulier — voit les devis/factures TTC, interface simplifiée |
| `BUILDING_COMPANY` (invitée) | Sous-traitant — voit uniquement son lot et ses montants |

**À implémenter** : table `ProjectParticipation` pour lier une organisation à un projet avec son périmètre (lots attribués, niveau de visibilité).

---

## Règles absolues

1. **Jamais de vérification de permission côté client** (composant React). Toujours Server Component ou Server Action.
2. **Jamais de `userId` fourni par le navigateur** — toujours extraire de `session.user.id`.
3. **Données financières** (coûts, marges, prix d'achat) : requêtes filtrées séparément, jamais dans un SELECT `*`.
4. Un utilisateur ne peut voir que les organisations dont il est membre `ACTIVE`.
5. Un utilisateur ne peut voir que les projets auxquels il est assigné (à implémenter).
6. Isolation interentreprises : une requête ne doit jamais retourner des données d'une autre org sans JOIN explicite sur la membership.

---

## Anti-patterns à éviter

```ts
// ❌ JAMAIS — données d'une org sans vérifier l'appartenance
const org = await db.query(`SELECT * FROM "Organization" WHERE id = $1`, [orgId]);

// ✅ TOUJOURS — jointure sur la membership
const org = await db.query(
    `SELECT o.* FROM "Organization" o
     JOIN "OrganizationMembership" m ON m."organizationId" = o.id
     WHERE o.id = $1 AND m."userId" = $2 AND m.status = 'ACTIVE'`,
    [orgId, session.user.id],
);
```
