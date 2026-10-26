# CLAUDE.md — BatiLib

> Document d'entrée pour les agents de code. Reflète l'état réel du dépôt au 23 octobre 2026.
> **Inspecter le code avant toute modification.** Ce fichier fait foi sur `docs/PROJECT_CONTEXT.md` pour l'état courant.

---

## 1. Architecture du dépôt

```
/
├── frontend/          Next.js App Router + Tailwind + TypeScript
├── backend/           NestJS + FastifyAdapter + TypeScript ESM
├── compose.yaml       PostgreSQL 17 Docker (port hôte 5433)
└── docs/PROJECT_CONTEXT.md   Vision produit et roadmap
```

**Frontend** : Next.js (16.x), App Router dans `frontend/app/` (pas de `src/`), Tailwind v4, shadcn/ui, Geist fonts.
**Backend** : NestJS 12, `FastifyAdapter`, ESM/NodeNext — imports relatifs **toujours en `.js`** même si le source est `.ts`.
**DB** : PostgreSQL 17 via Docker. `docker compose up -d` depuis la racine. Port hôte **5433** (vérifier `compose.yaml`).
**ORM** : Prisma 7 (`backend/prisma7.config.ts`), driver `@prisma/adapter-pg`. Client généré dans `backend/src/generated/prisma/` — **ne jamais éditer le client généré**.
**Auth** : Better Auth hébergé côté **Next.js** uniquement (`frontend/lib/auth.ts`). Nest n'a pas d'auth propre pour l'instant.
**DB frontend** : `frontend/lib/db.ts` expose un `Pool` pg direct (même DB que Prisma, utilisé pour les Server Actions organisation).

---

## 2. Variables d'environnement

**`frontend/.env.local`** (jamais versionner) :
```
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://...@localhost:5433/batilib
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
BREVO_API_KEY=
BREVO_SENDER_NAME=
BREVO_SENDER_EMAIL=
R2_ENDPOINT=
R2_REGION=auto
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

**`backend/.env`** : `DATABASE_URL` identique.

---

## 3. Commandes essentielles

```bash
# Racine
docker compose up -d

# frontend/
pnpm dev
pnpm build

# backend/
pnpm start:dev
pnpm build
pnpm prisma validate
pnpm prisma migrate status
pnpm prisma generate
pnpm prisma migrate dev --name <nom>   # seulement si migration nécessaire
```

---

## 4. Schéma de données (Prisma — état actuel)

### Identité (géré par Better Auth)
- **`User`** : `id`, `name`, `email` (unique), `emailVerified`, `image` (URL), `role` (enum `PlatformRole`: `user`/`admin`), `banned`, `banReason`, `banExpires`, dates.
- **`Account`** : provider `credential` (mot de passe) ou `google`. Plusieurs Account par User.
- **`Session`** : token, `expiresAt`, `ipAddress`, `userAgent`, `impersonatedBy`.
- **`Verification`** : OTP et liens de vérification.

### Organisation (multi-tenant)
- **`Organization`** : `id`, `kind` (enum `OrganizationKind`: `BUILDING_COMPANY` / `CLIENT_COMPANY` / `INDIVIDUAL_CLIENT`), `name`, `description`, `legalName`, `siren`, `siret`, `vatNumber`, `logoUrl`.
- **`OrganizationMembership`** : jointure User↔Organization, `role` (enum `OrganizationMemberRole`: `FOUNDER` / `MANAGER` / `MEMBER`), `status` (enum `MembershipStatus`: `PENDING` / `ACTIVE` / `SUSPENDED`). Unique sur `(organizationId, userId)`.
- **`OrganizationInvitation`** : `email`, `role`, `token` (UUID unique), `expiresAt` (+7 jours), `invitedById`.
- **`TradeCategory`** : référentiel métiers (`code`, `label`).
- **`OrganizationTradeCategory`** : jointure Organization↔TradeCategory.

### Règles d'autorisation organisation (côté serveur)
Toutes les mutations organisation vérifient le rôle via `getCallerRole()` dans `frontend/lib/actions/organization-settings.ts`. Seul le `FOUNDER` peut : modifier l'identité, changer les rôles, retirer des membres, inviter, transférer le rôle fondateur. Le transfert de fondateur est une transaction atomique (BEGIN/COMMIT).

---

## 5. Authentification — Better Auth

**Config** : `frontend/lib/auth.ts`
**Client** : `frontend/lib/auth-client.ts`
**Route** : `frontend/app/api/auth/[...all]/route.ts`

### Plugins actifs
- `admin` : `defaultRole: "user"`, `adminRoles: ["admin"]`. Permet `auth.api.listUsers()`, impersonation.
- `emailOTP` : OTP 6 chiffres, expire 300s, `overrideDefaultEmailVerification: true`.

### Fournisseurs
- **email+password** (`credential`) : inscription, connexion, réinitialisation mot de passe (email Brevo avec lien).
- **Google** (`google`) : OAuth.
- `accountLinking.trustedProviders: ["google", "credential"]` — linking automatique si même email vérifié.

### Règles critiques
- **Ne JAMAIS mettre `requireEmailVerification: true`** dans `emailAndPassword` : casse la session post-inscription. Le blocage des pages non vérifiées est géré par les Server Components.
- Le rôle `role` est `input: false` — jamais modifiable par l'utilisateur. Changement de rôle = action admin uniquement.
- `account_not_linked` : compte email local non vérifié + tentative Google avec même email → rediriger vers `/auth/verify-existing-account`.

### Parcours auth implémentés
| Page | Rôle |
|------|------|
| `/login` | Connexion email/pw + Google |
| `/register` | Inscription → OTP |
| `/verify-email` | Vérification OTP post-inscription |
| `/forgot-password` | Demande reset mot de passe |
| `/reset-password` | Nouveau mot de passe (lien email) |
| `/auth/error` | Erreurs OAuth |
| `/auth/verify-existing-account` | Linking Google sur compte existant |

---

## 6. Pages et routes frontend

### Structure App Router
```
app/
  page.tsx                          → redirect /app (racine publique)
  (auth)/                           → layout sans sidebar (pages auth)
    login, register, verify-email,
    forgot-password, reset-password,
    auth/error, auth/verify-existing-account
  (app)/                            → layout avec sidebar (protégé)
    layout.tsx                      → vérifie session + emailVerified
    profile/page.tsx                → profil utilisateur
    app/page.tsx                    → redirect /app/:orgId ou /onboarding
    app/[orgId]/
      page.tsx                      → accueil organisation (placeholder)
      layout.tsx                    → layout avec orgId dans l'URL
      organization/
        page.tsx                    → redirect /organization/presentation
        presentation/page.tsx       → identité + légal (OrgPresentationClient)
        members/page.tsx            → membres + invitations (MembersClient)
        billing/page.tsx            → (placeholder)
  onboarding/page.tsx               → création organisation (OnboardingForm)
  admin/
    layout.tsx                      → vérifie role=admin
    users/page.tsx                  → liste utilisateurs
  api/
    auth/[...all]/route.ts          → Better Auth handler
    upload/avatar/route.ts          → POST upload avatar → R2
    files/[...key]/route.ts         → GET proxy R2 → signed URL (302)
```

### Flux de navigation
1. Utilisateur non connecté → `/login`
2. Connecté non vérifié → `/verify-email`
3. Connecté + vérifié, sans org → `/onboarding`
4. Connecté + vérifié + org → `/app/:orgId`
5. Admin → accès `/admin` en plus (lien dans sidebar si `role === "admin"`)

---

## 7. Server Actions (pattern)

Les Server Actions sont dans `frontend/lib/actions/`. Toutes commencent par vérifier la session :
```ts
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return { error: "Non authentifié" };
```

Requêtes DB via `db` (Pool pg direct) — **pas Prisma côté frontend**. SQL paramétré, transactions explicites pour opérations atomiques.

Fichiers :
- `organization.ts` : `createOrganization`, `getUserPrimaryOrgId`
- `organization-settings.ts` : `getOrgWithRole`, `getOrgMembers`, `updateOrganization`, `updateMemberRole`, `removeMember`, `transferFounder`, `inviteMember`

---

## 8. Profil utilisateur (`/profile`)

Fonctions implémentées dans `ProfileClient` :
- **Modifier le nom** : `authClient.updateUser({ name })`
- **Modifier la photo** : upload via `POST /api/upload/avatar` → R2 → `authClient.updateUser({ image: url })`
- **Changer le mot de passe** : `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`
- **Supprimer le compte** : `authClient.deleteUser()` avec confirmation par saisie de phrase "supprimer mon compte"
- **Méthodes de connexion** : `authClient.listAccounts()` → affiche credential/google avec badge statut

---

## 9. Stockage fichiers — Cloudflare R2

**Client** : `frontend/lib/r2.ts` — `S3Client` avec `@aws-sdk/client-s3`.

### Upload avatar
- `POST /api/upload/avatar` : auth requise, formats JPEG/PNG/WEBP, max 5 Mo.
- Clé R2 : `avatars/{userId}/{uuid}.{ext}`
- Supprime l'ancien avatar R2 si `user.image` commence par `/api/files/`
- Retourne `{ url: "/api/files/avatars/..." }`

### Accès fichiers
- `GET /api/files/[...key]` : génère une URL signée R2 (`expiresIn: 3600`) → redirect 302.
- Avatars : accès public intentionnel (pas de vérification de session).
- **Pour les futurs fichiers sensibles** (docs, factures) : ajouter vérification session + droits dans cette route avant de générer l'URL.

---

## 10. Email — Brevo

**Fonction** : `frontend/lib/mail/send-email.ts` — API transactionnelle Brevo.
**Usages actuels** :
- OTP vérification email (via plugin `emailOTP` de Better Auth)
- Lien reset mot de passe (via `emailAndPassword.sendResetPassword`)

Template OTP : HTML inline simple (no-framework). Clé `BREVO_API_KEY` côté serveur uniquement.

---

## 11. UI/UX — Design system

**Inspiration** : Notion/Linear — épuré, neutre, blanc/gris. Mode clair uniquement.
**Composants** : shadcn/ui dans `frontend/components/ui/`. Geist Sans + Geist Mono.

### Tokens CSS clés (`globals.css`)
| Token | Valeur | Usage |
|-------|--------|-------|
| `--background` | blanc pur | page |
| `--surface` | #ffffff | cartes, modales |
| `--subtle` | #f9fafb (gray-50) | sidebar, fonds secondaires |
| `--hover` | #e5e7eb (gray-200) | survol |
| `--foreground` | gray-900 | texte principal |
| `--muted-foreground` | gray-700 | descriptions, captions |
| `--border` | gray-200 | bordures standard |
| `--destructive` | red-600 | erreurs, danger |
| `--success` | green-600 | succès |
| `--warning` | amber-600 | avertissement |
| `--info` | blue-600 | info |

### Classes utilitaires définies
- `.nav-item` / `.nav-item-active` : liens sidebar
- `.page-title` : titre de page (h1)
- `.section-title` : titre de section (h2)
- `.body-sm` : texte corps 14px
- `.caption` : texte secondaire 13px, muted
- `.text-error` : texte rouge erreur
- `.input-otp` : champ OTP centré monospace
- `.avatar-initials` : avatar fallback initiales

### Patterns UI récurrents
- **Sheet** (panneau latéral) : édition de formulaires (profil, identité org, SIRET)
- **Dialog** : confirmations destructives (suppression compte)
- **Badge** variants : `success`, `neutral`, `warning`, `info`, `destructive`
- Sidebar : `w-56`, bordure droite, logo en haut, nav centrale, dropdown user en bas
- Contenu principal : `flex-1 overflow-auto bg-background`, padding `p-8`, `max-w-2xl` ou `max-w-5xl`

---

## 12. Sécurité — règles absolues

1. **Jamais de vérification d'autorisation côté client.** Toujours côté serveur (Server Component ou Server Action).
2. **Jamais d'entité Prisma brute** renvoyée au client — projections DTO filtrées.
3. **Jamais de userId envoyé par le navigateur** comme paramètre de confiance — toujours extraire de la session serveur.
4. **Données financières** (coûts, marges, prix d'achat) : protégées séparément, jamais accessibles implicitement.
5. **Migrations** : inspecter le SQL avant `prisma migrate dev`. Jamais de `migrate reset` sans approbation explicite.
6. **Secrets** : jamais dans le code ni les commits. `.env.local` et `.env` dans `.gitignore`.
7. **Nest** : aucun endpoint authentifié pour l'instant — ne pas exposer d'API métier sensible sans guard d'auth.

---

## 13. État fonctionnel — 26 octobre 2026

| Fonctionnalité | Statut |
|----------------|--------|
| Auth email/password (inscription, connexion, déconnexion) | ✅ Fait |
| Vérification OTP email (Brevo) | ✅ Fait |
| Reset mot de passe (email avec lien) | ✅ Fait |
| Connexion Google + account linking | ✅ Fait |
| Blocage `/app` si non connecté / non vérifié | ✅ Fait |
| Admin `/admin/users` (liste, rôles) | ✅ Fait |
| Profil : modifier nom | ✅ Fait |
| Profil : modifier photo (upload R2) | ✅ Fait |
| Profil : changer mot de passe | ✅ Fait |
| Profil : supprimer compte (avec confirmation) | ✅ Fait |
| Profil : méthodes connexion (credential/google) | ✅ Fait |
| Onboarding : création organisation (3 types) | ✅ Fait |
| Organisation : présentation + édition (FOUNDER) | ✅ Fait |
| Organisation : membres + rôles + retrait | ✅ Fait |
| Organisation : transfert fondateur | ✅ Fait |
| Organisation : invitations (création token + email Brevo) | ✅ Fait |
| Organisation : invitations en attente (liste, renvoyer, annuler) | ✅ Fait |
| Acceptation d'invitation par token (`/join`) | ✅ Fait |
| Bibliothèque : arbre WIT/dossiers/WPT, DnD, CRUD | ✅ Fait |
| Éditeur projet : vue par espace + vue par lot, DnD | ✅ Fait |
| Éditeur projet : import depuis bibliothèque (picker 2 panneaux) | ✅ Fait |
| Éditeur projet : création WP auto depuis WPT sur import bibliothèque | ✅ Fait |
| Éditeur projet : statut inline DRAFT/IN_PROGRESS/DONE/CANCELLED | ✅ Fait |
| Page intervenants projet (LEAD + CLIENT + sous-traitants verrouillés) | ✅ Fait |
| Invitation client sur un projet (`ProjectInvitation` + page `/join-project`) | ✅ Fait |
| Dispatcher éditeur LEAD → `LeadEditorClient` / CLIENT → `ClientProjectView` | ✅ Fait |
| Sidebar nav projet role-aware (LEAD/CLIENT/SUBCONTRACTOR) | ✅ Fait |
| Nest : endpoints métier authentifiés | ❌ Non fait |

---

## 14. Prochaines priorités

1. **API Nest** : mettre en place un guard d'auth (valider le cookie de session Better Auth) avant tout endpoint métier.
2. **Éditeur — temps réel** : brancher Socket.io (Gateway Nest) sur l'éditeur de chantier (voir section 16).
3. **Éditeur — devis/chiffrage** : affichage des prix et marges dans l'éditeur (données financières protégées).

---

## 15. Pattern invitation par token — à réutiliser

Implémenté pour les organisations. À réutiliser (avec adaptation) pour les invitations sur les projets.

### Table `OrganizationInvitation`
`id`, `organizationId`, `email`, `role`, `token` (UUID unique), `expiresAt` (+7 jours), `invitedById`, `createdAt`.
Pas de `userId` — l'invité peut ne pas avoir de compte au moment de l'invitation.

### Flux complet
1. FOUNDER invite → token UUID créé en DB → email Brevo avec lien `/join?token=xxx`
2. Destinataire clique → page `/join` (hors `(app)` et `(auth)`, accessible sans session)
   - Non connecté → CTAs "Se connecter" / "Créer un compte" avec `?redirectTo=/join?token=xxx`
   - Connecté, email correspond → "Accepter" / "Ignorer"
   - Connecté, email différent → avertissement, bouton désactivé
3. `acceptInvitation(token)` : vérifie email match, crée `OrganizationMembership` ACTIVE en transaction, supprime l'invitation
4. `declineInvitation(token)` : supprime l'invitation (session requise, bouton visible uniquement si connecté)

### Support `redirectTo` dans les pages auth
`/login`, `/register`, `/verify-email` lisent tous `?redirectTo=` (validé : doit commencer par `/`).
Propagé de register → verify-email → destination finale. Google OAuth utilise `callbackURL: redirectTo`.

### Gestion côté membres
`getOrgInvitations` : liste les invitations non expirées.
`resendInvitation` : régénère le token + `expiresAt`, renvoie l'email (ancien lien invalidé).
`cancelInvitation` : supprime l'invitation.
Section "Invitations en attente" affichée dans la page membres **seulement si** `invitations.length > 0`.

### Invitation client projet — implémentée (voir section 18)

---

## 16. Décisions architecturales à ne pas changer silencieusement

- Auth **côté Next.js uniquement** (Better Auth). Ne pas migrer vers Nest sans discussion.
- **Un seul `name`** (pas `firstName`/`lastName`) pour les utilisateurs.
- **`requireEmailVerification: false`** dans Better Auth — le blocage est dans les layouts Server Component.
- DB partagée entre Next (pg Pool direct) et Nest (Prisma) — pas de seconde base.
- Fichiers dans **Cloudflare R2**, accédés via proxy signé `/api/files/[...key]`.
- Google et mot de passe seulement — pas d'autre provider en V0.

---

## 17. Éditeur de projet — architecture implémentée (26 oct 2026)

### Route
`/[orgSlug]/projects/[projectSlug]/editors` — Server Component (`page.tsx`) + Client Components.

### Fichiers
```
app/(app)/[orgSlug]/projects/[projectSlug]/editors/
  page.tsx                    → Server Component, dispatcher LEAD/CLIENT via resolveProjectAccess
  _components/
    editor-client.tsx         → LeadEditorClient : toggle vue (espace/lot), state local, EditorProvider
    client-project-view.tsx   → ClientProjectView : vue read-only (progression, espaces, lots)
    editor-context.tsx        → Context : orgSlug, projectSlug, projectId, workPackages, libraryTree, workPackageTemplates, onRefresh
    space-view.tsx            → DndContext unique pour vue espace (reorder spaces + items)
    space-section.tsx         → Composant récursif espace (useSortable, SortableContext enfants)
    package-view.tsx          → DndContext pour vue lot (reorder items dans WP)
    work-package-section.tsx  → Section lot (useSortable, SortableContext items)
    work-item-row.tsx         → Ligne ouvrage (useSortable, status badge, dot couleur lot)
    work-item-form-sheet.tsx  → Sheet création/édition ouvrage (name, qty, unit, lot)
    work-item-form-sheet.tsx  → Sheet création/édition espace
    library-picker-sheet.tsx  → Sheet import depuis bibliothèque (2 panneaux : arbre + liste)
    work-package-form-sheet.tsx → Sheet création/édition lot (color picker LOT_COLORS)
```

### Server Actions — `frontend/lib/actions/project-editor.ts`
- `getProjectEditorData(orgSlug, projectSlug)` → `ProjectEditorData` (espaces + WP + items + libraryTree + WPTs)
- `createProjectSpace` / `deleteProjectSpace` / `reorderSpaces`
- `createWorkItem` / `updateWorkItemStatus` / `deleteWorkItem` / `reorderWorkItems`
- `createWorkPackage` / `deleteWorkPackage` (transaction BEGIN/COMMIT : unassign items → delete WP)
- `resolveEffectiveWptFromTemplate(templateId)` : remonte la hiérarchie de `LibraryFolder` pour trouver le premier ancêtre avec `workPackageTemplateId`
- `resolveOrCreateWorkPackage(orgSlug, projectId, wptId)` : idempotent — cherche par `sourceWorkPackageTemplateId` avant de créer

### Règles et patterns
- **Resolution WPT → WP** : 100 % serveur (jamais côté client). `createWorkItem` reçoit `templateId` optionnel, la résolution WPT est transparente.
- **Sécurité `parentId`** : `createProjectSpace` valide que le `parentId` appartient bien au même projet avant INSERT.
- **DnD** : `useId()` sur chaque `DndContext`, un composant React par item sortable (pas de hook dans fonction récursive).
- **État local** : `useState` initialisé depuis les props + `useEffect([data])` pour resynchroniser après `router.refresh()`.
- **Statut** : enum `WorkItemStatus` = `DRAFT | IN_PROGRESS | DONE | CANCELLED`, badge cliquable inline (DropdownMenu).

---

## 18. Intervenants projet — dispatcher & permissions (26 oct 2026)

### Rôles participants (`ProjectParticipantRole`)
- `LEAD` : organisation pro qui pilote le projet (créée à la création du projet)
- `CLIENT` : organisation cliente invitée via `ProjectInvitation`
- `SUBCONTRACTOR` : sous-traitant assigné via les lots (non implémenté)

### `resolveProjectAccess(orgSlug, projectSlug)` — `frontend/lib/actions/projects.ts`
Point d'entrée unique pour toutes les pages projet. Une seule query combine :
- vérification que l'user est membre ACTIVE de orgSlug
- récupération du rôle participant (LEAD/CLIENT/SUBCONTRACTOR)
Retourne `{ projectId, projectName, projectSlug, callerParticipantRole, callerOrgRole }` ou `null`.
**Utiliser cette fonction** dans le layout et les pages pour toute vérification de droit projet.

### Layout projet — `[projectSlug]/layout.tsx`
Simple gateway : appelle `resolveProjectAccess`, redirige si null, sinon `SetActiveProject` + children.
**Pas de header ni de tabs dans le layout** — la sidebar gère la navigation projet.

### `ActiveProjectContext` — `frontend/lib/context/active-project.tsx`
Étendu avec `participantRole: ProjectParticipantRole`. La sidebar lit ce champ pour adapter la nav.
`SetActiveProject` accepte maintenant `participantRole` en prop obligatoire.

### Sidebar nav role-aware — `components/layout/app-sidebar.tsx`
`getProjectNavItems(orgSlug, projectSlug, role)` retourne des tabs différents :
- LEAD : Éditeur / Intervenants / Documents / Économie
- CLIENT : Projet / Intervenants / Documents
- SUBCONTRACTOR : Mes lots / Intervenants / Documents
Le label du groupe projet affiche "Client" ou "Sous-traitant" en grisé si rôle ≠ LEAD.

### Dispatcher pages — pattern à suivre
```tsx
// page.tsx
const access = await resolveProjectAccess(orgSlug, projectSlug);
if (!access) notFound();
if (access.callerParticipantRole === "CLIENT") return <ClientXxxView ... />;
// LEAD (+ SUBCONTRACTOR en attendant)
return <LeadXxxClient ... />;
```

### Sécurité reads vs mutations
- **Reads** (`getProjectMembers`, `getProjectEditorData`, etc.) : lookup par `ProjectParticipant` → accessible à tous les rôles.
- **Mutations** (`createWorkItem`, `reorderSpaces`, etc.) : lookup via `leadOrganizationId` dans `getProjectId()` → LEAD uniquement, échoue silencieusement pour CLIENT.
- `canManage` côté UI : vérifier `callerParticipantRole === "LEAD" && (callerOrgRole === "FOUNDER" || callerOrgRole === "MANAGER")`.

---

## 19. Invitation client projet — `ProjectInvitation` (26 oct 2026)

### Table `ProjectInvitation`
`id`, `projectId` (**UNIQUE** — 1 seule invitation active par projet), `invitedEmail`, `token` (UUID unique), `expiresAt` (+7j), `invitedById`, `createdAt`.
Pas d'`organizationId` côté invité — l'organisation est choisie au moment de l'acceptation.

### Actions — `frontend/lib/actions/project-members.ts`
- `inviteClientToProject(orgSlug, projectSlug, email)` : FOUNDER/MANAGER LEAD only. Vérifie absence de CLIENT participant + absence d'invitation active. Envoie email Brevo.
- `resendProjectInvitation(orgSlug, projectSlug)` : régénère token + expiresAt, renvoie l'email.
- `cancelProjectInvitation(orgSlug, projectSlug)` : supprime l'invitation.
- `getProjectClientInvitation(orgSlug, projectSlug)` : retourne l'invitation en attente ou null. Retourne null si appelé depuis un org non-LEAD (comportement correct).
- `removeProjectClient(orgSlug, projectSlug)` : supprime le `ProjectParticipant` CLIENT (cascade sur `ProjectParticipantMember`).

### Actions — `frontend/lib/actions/project-invitation.ts` (actions publiques)
- `getProjectInvitationPreview(token)` : pas de session requise, retourne infos projet + inviteur.
- `getUserOrgsForProjectJoin(userId)` : orgs de l'user avec leur rôle (FOUNDER/MANAGER/MEMBER).
- `acceptProjectInvitation(token, orgId)` : crée `ProjectParticipant` CLIENT + `ProjectParticipantMember` (l'user acceptant) en transaction. Redirige vers `/{clientOrgSlug}/projects/{projectSlug}`.
- `declineProjectInvitation(token)` : supprime l'invitation.

### Page `/join-project?token=xxx` — `app/join-project/`
Hors `(app)` et `(auth)`, accessible sans session. 4 états :
1. Non connecté → login/register CTAs avec `redirectTo`
2. Email différent → avertissement
3. Connecté, orgs éligibles (FOUNDER/MANAGER) → sélection + orgs MEMBER grisées + option créer une nouvelle org
4. Aucune org éligible → CTA vers `/onboarding?redirectTo=/join-project?token=xxx`

### Onboarding avec `redirectTo`
`/onboarding?redirectTo=...` : si `redirectTo` présent, skip la redirection "déjà une org" et redirige vers `redirectTo` après création. Permet le flux : email invitation → inscription → onboarding → acceptation.

---

## 16. Architecture cible — éditeur de chantier (temps réel)

Décisions validées avant implémentation :

- **Temps réel** : WebSockets via `@nestjs/websockets` + Socket.io. Une "room" par chantier. Guard d'auth sur la connexion WebSocket (valider le cookie de session Better Auth).
- **Conflits** : last-write-wins par champ (quantité, prix, libellé). Pas de CRDT (Yjs/Automerge) — réservé à l'édition de texte concurrent, inutile pour des champs structurés.
- **Cache client** : TanStack Query pour le fetch initial et l'invalidation après mutation. Le socket pousse les updates live, Query gère le cache.
- **Structure composants** : page = Server Component (fetch initial), composants d'édition = Client Components (useState + socket.io-client).
- **Nest** : c'est le bon endroit pour la Gateway WebSocket et la persistence des changements via Prisma.
