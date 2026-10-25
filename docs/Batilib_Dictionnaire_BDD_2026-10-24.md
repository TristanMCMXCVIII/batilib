# BatiLib — Dictionnaire de données (modèle cible de la page « DB »)

> Source : fichier Figma **BatiLib**, page **DB**, consultée le **24 octobre 2026**.
> Figma : https://www.figma.com/design/LmWW3v0qlWbo6dndn7NPRi/BatiLib?node-id=0-1

**Périmètre : 52 tables actives/non legacy présentes sur cette page.** Ont été entièrement exclus : `Party`, `ProjectParticipation` (ancien modèle), `ParticipationWorkPackage`. Ont également été exclus les champs explicitement marqués `[legacy]` ou `[obsolète]` et les lignes rouges (ex. anciennes FK Party). Les tables marquées « OPTIONNEL » dans Figma sont conservées et signalées : elles sont dans le modèle dessiné, mais pas forcément dans le MVP.

## Important pour l’IA qui utilisera ce document

1. **Ce document restitue un modèle de conception Figma, PAS un export du schéma PostgreSQL en production.** Il ne confirme pas quelles tables existent actuellement dans Prisma.
2. **La plupart des types Prisma ne figurent pas dans le Figma.** Ils sont ici **proposés / déduits par convention** (String, DateTime, Decimal, Int, Boolean, Enum). Seuls `JSONB`, certaines valeurs d’enums et `UNIQUE` sont explicitement écrits dans la page source. Ne pas les considérer comme des migrations validées.
3. `?` indique un champ facultatif, `→` une relation dessinée. `PK`, `FK`, indices, unicités implicites et les stratégies de suppression doivent être confirmés à l’implémentation.
4. Le modèle Figma `User` affiche `firstName` et `lastName`, alors que la V0 Better Auth construite précédemment utilisait `name`, `emailVerified` et `image`. **Ne pas remplacer le schéma d’auth existant sans analyse et arbitrage.** De même, la page Figma `Verification` montre un `userId` non standard à rapprocher du modèle Better Auth réel.
5. `OrganizationRole` est dessiné comme personnalisable dans Figma ; des réflexions plus récentes envisagent des rôles d’organisation simplifiés. Ne pas implémenter un RBAC dynamique sans validation.
6. **Sécurité :** les coûts et marges sont privés à chaque organisation ; contrôler les permissions sur le serveur. `ProjectParticipant` et l’affectation des lots déterminent les accès projet.

## Conventions

| Notation | Sens |
|---|---|
| `String` | Chaîne / identifiant textuel (type suggéré) |
| `Decimal` | Quantités, taux, prix et montants (préféré à Float pour les montants) |
| `DateTime` | Date ou horodatage (convention proposée, à préciser) |
| `Boolean` | Vrai/faux |
| `Json` | JSONB PostgreSQL, explicitement signalé dans Figma |
| `Enum ou String` | Ensemble fini de valeurs métier : à typer définitivement |
| `?` | Nullable / optionnel dans le dessin |
| `FK` | Clé étrangère présumée, à confirmer avec le schéma final |

---

## 01 · Comptes et organisations

### User

**Description.** Une personne physique possédant un compte BatiLib. Le rôle et les entreprises d'appartenance passent par OrganizationMembership. La description Figma évoque un identifiant d'authentification externe, mais celui-ci n'est pas dessiné parmi les champs.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `email` | `String` | requis (d’après le diagramme); unique attendu dans Better Auth | Adresse email de l’utilisateur ou du destinataire |
| `firstName` | `String` | requis (d’après le diagramme) | Prénom de la personne |
| `lastName` | `String` | requis (d’après le diagramme) | Nom de famille |
| `avatarUrl` | `String?` | nullable | URL de l’image de profil |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### Account

**Description.** Méthode de connexion liée à une personne : identifiants locaux ou fournisseur OAuth. Un même utilisateur peut posséder plusieurs comptes de connexion Better Auth.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `userId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Utilisateur associé |
| `providerId` | `String` | requis (d’après le diagramme); valeurs : Google | Apple | Facebook... | Identifiant du fournisseur de connexion (ex. google, credential) |
| `accountId` | `String` | requis (d’après le diagramme) | Identifiant du compte chez le fournisseur d’identité |
| `accessToken` | `String?` | nullable | Jeton d’accès OAuth |
| `refreshToken` | `String?` | nullable | Jeton de rafraîchissement OAuth |
| `accessTokenExpiresAt` | `DateTime?` | nullable | Expiration du jeton d’accès |
| `refreshTokenExpiresAt` | `DateTime?` | nullable | Expiration du jeton de rafraîchissement |
| `scope` | `Enum ou String?` | nullable | Périmètre de la variable ou du jeton |
| `idToken` | `String?` | nullable | Jeton d’identité OAuth/OIDC |
| `password` | `String?` | nullable; hash uniquement; ne jamais exposer via API | Hash de mot de passe ; jamais en clair |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### Session

**Description.** Session d'authentification Better Auth associée à un utilisateur. Le dessin répète userId ; il n'est décrit qu'une fois ici.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `userId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Utilisateur associé |
| `token` | `String` | requis (d’après le diagramme) | Jeton opaque de session |
| `expiresAt` | `DateTime` | requis (d’après le diagramme) | Date d’expiration |
| `ipAddress` | `String?` | nullable | Adresse IP associée à la session |
| `userAgent` | `String?` | nullable | Signature du navigateur/appareil |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### Verification

**Description.** Jeton temporaire de vérification Better Auth (email, récupération ou OTP). Le dessin répète id, createdAt et updatedAt ; chaque champ n'est décrit qu'une fois ici. La présence de userId doit être confirmée avec le modèle réel Better Auth.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `userId` | `String` | FK (relation à confirmer); requis (d’après le diagramme); À VALIDER : champ absent du schéma Better Auth standard observé en V0 | Utilisateur associé |
| `identifier` | `String` | requis (d’après le diagramme) | Identifiant cible du challenge de vérification |
| `value` | `String` | requis (d’après le diagramme) | Valeur de la variable ou du droit/entitlement |
| `expiresAt` | `DateTime` | requis (d’après le diagramme) | Date d’expiration |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### Organization

**Description.** Espace de travail personnel, collectif ou professionnel. Le rôle de l'organisation dans un chantier (client, responsable, sous-traitant) est défini projet par projet ; son profil bâtiment est facultatif.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `kind` | `Enum ou String` | requis (d’après le diagramme); valeurs : PERSONAL_GROUP | BUSINESS | Nature de l’espace de travail |
| `name` | `String` | requis (d’après le diagramme) | Nom affiché ou intitulé de l’élément |
| `legalName` | `String?` | nullable | Raison sociale officielle |
| `siren` | `String?` | nullable | Identifiant SIREN (9 chiffres) |
| `vatNumber` | `String?` | nullable | Numéro de TVA intracommunautaire |
| `logoUrl` | `String?` | nullable | URL du logo |
| `professionalProfile` | `Relation vers BuildingProfessionalProfile?` | relation 1:1 facultative (explicite) | Association au profil bâtiment optionnel |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### OrganizationRole

**Description.** Rôle interne configurable d'une organisation. La version dessinée prévoit un rôle système FOUNDER protégé, et des permissions validées par le serveur. La simplification récente des rôles d'entreprise reste à rapprocher du schéma Figma.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `name` | `String` | requis (d’après le diagramme) | Nom affiché ou intitulé de l’élément |
| `permissions` | `Json` | requis (d’après le diagramme); JSONB explicite | Dictionnaire des droits accordés par le rôle |
| `systemKey` | `String?` | nullable | Identifiant d’un rôle système prédéfini |
| `isProtected` | `Boolean` | requis (d’après le diagramme) | Indique si le rôle est protégé contre modification/suppression |
| `position` | `Int?` | nullable | Ordre d’affichage |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### OrganizationMembership

**Description.** Appartenance d'un utilisateur à une organisation et à un rôle. Un utilisateur peut rejoindre plusieurs organisations. Le transfert du rôle fondateur doit préserver au moins un fondateur actif.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `userId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Utilisateur associé |
| `organizationRoleId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Référence du rôle d’organisation |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### OrganizationTradeCategory

**Description.** Association N-N entre entreprise et catégorie de métier exercé ; utile pour la recherche de partenaires et les appels d'offres.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `tradeCategoryId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Catégorie métier associée |

> **Clé de jonction :** aucun `id` n’est dessiné ; privilégier une clé composée des deux références, à confirmer au moment de créer le modèle Prisma.

### BuildingProfessionalProfile

**Description.** Extension facultative pour les organisations professionnelles du bâtiment ; visibilité publique et justificatifs contrôlés séparément.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme); UNIQUE explicite | Organisation concernée |
| `siret` | `String?` | nullable | Identifiant SIRET (14 chiffres) |
| `publicProfileEnabled` | `Boolean?` | nullable | Profil public du professionnel activé ou non |
| `verificationStatus` | `Enum ou String?` | nullable | Statut de vérification du professionnel |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### OrganizationInvitation

**Description.** Invitation par email pour rejoindre une organisation. L'appartenance n'est accordée qu'après acceptation.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `email` | `String` | requis (d’après le diagramme) | Adresse email de l’utilisateur ou du destinataire |
| `organizationRoleId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Référence du rôle d’organisation |
| `invitedByMembershipId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Référence du membre d’organisation qui envoie l’invitation |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `expiresAt` | `DateTime` | requis (d’après le diagramme) | Date d’expiration |
| `acceptedAt` | `DateTime?` | nullable | Date de validation du devis ou de l’avenant |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |


## 02 · Projet et participants

### Project

**Description.** Chantier physique unique et entité métier centrale. L'organisation responsable est précisée par leadOrganizationId ; clients et sous-traitants sont des ProjectParticipant.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `leadOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation responsable du chantier |
| `name` | `String` | requis (d’après le diagramme) | Nom affiché ou intitulé de l’élément |
| `address` | `String?` | nullable | Adresse du chantier |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `startDate` | `DateTime?` | nullable | Début du projet |
| `endDate` | `DateTime?` | nullable | Fin prévue/réelle du projet |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### ProjectParticipant

**Description.** Participation d'une organisation à un projet, comme responsable, client ou sous-traitant. LEAD doit correspondre à leadOrganizationId ; la visibilité du sous-traitant est limitée à ses lots.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Chantier concerné |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `role` | `Enum ou String` | requis (d’après le diagramme); valeurs : LEAD | CLIENT | SUBCONTRACTOR | Champ métier « role » (préciser les règles de gestion) |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `revokedAt` | `DateTime?` | nullable | Date de révocation de l’accès |

### ProjectParticipantMember

**Description.** Affectation explicite d'un membre d'une organisation participante à un chantier. La cohérence des organisations des deux références doit être vérifiée côté serveur.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectParticipantId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Référence d’une organisation participant au chantier |
| `organizationMembershipId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Référence de l’appartenance d’un utilisateur à une organisation |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `revokedAt` | `DateTime?` | nullable | Date de révocation de l’accès |

### ProjectInvitation

**Description.** Invitation d'une personne à rejoindre un projet ; à l'acceptation, son organisation est associée via ProjectParticipant.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Chantier concerné |
| `email` | `String` | requis (d’après le diagramme) | Adresse email de l’utilisateur ou du destinataire |
| `invitedByMembershipId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Référence du membre d’organisation qui envoie l’invitation |
| `targetRole` | `Enum ou String` | requis (d’après le diagramme) | Rôle prévu dans le projet à l’acceptation de l’invitation |
| `organizationId` | `String?` | FK (relation à confirmer); nullable | Organisation concernée |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `expiresAt` | `DateTime` | requis (d’après le diagramme) | Date d’expiration |
| `acceptedAt` | `DateTime?` | nullable | Date de validation du devis ou de l’avenant |


## 03 · Structure et suivi du chantier

### ProjectSpace

**Description.** Emplacement physique hiérarchique et facultatif d'un chantier : bâtiment, étage, logement, pièce ; support de variables de quantitatif.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Chantier concerné |
| `parentId` | `String?` | FK (relation à confirmer); nullable | Référence à un parent de la même table (hiérarchie) |
| `name` | `String` | requis (d’après le diagramme) | Nom affiché ou intitulé de l’élément |
| `position` | `Int` | requis (d’après le diagramme) | Ordre d’affichage |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### VariableDefinition

**Description.** Définition d'une variable de quantitatif de l'organisation, réutilisable dans des formules de WorkTemplate.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `key` | `String` | requis (d’après le diagramme) | Clé stable d’identification |
| `label` | `String` | requis (d’après le diagramme) | Libellé lisible |
| `unit` | `String?` | nullable | Unité de mesure (m², m³, ml, u, etc.) |
| `dataType` | `Enum ou String` | requis (d’après le diagramme) | Type logique de la variable (nombre, texte, etc.) |
| `scope` | `Enum ou String` | requis (d’après le diagramme) | Périmètre de la variable ou du jeton |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### SpaceVariableValue

**Description.** Valeur d'une variable définie pour un espace, utilisée dans le calcul des quantités.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `spaceId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Référence de ProjectSpace |
| `variableDefinitionId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Définition de variable concernée |
| `value` | `Json` | requis (d’après le diagramme); JSONB explicite | Valeur de la variable ou du droit/entitlement |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### TradeCategory

**Description.** Taxonomie universelle des métiers du bâtiment, servant de langage commun aux organisations, modèles, lots, ouvrages et consultations.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `code` | `String` | requis (d’après le diagramme) | Code métier stable |
| `label` | `String` | requis (d’après le diagramme) | Libellé lisible |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### WorkPackage

**Description.** Lot facultatif d'un projet. Un unique participant peut en être actuellement titulaire ; l'attribution doit rester dans le même projet. Il ne conserve pas l'historique des réattributions.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Chantier concerné |
| `assignedProjectParticipantId` | `String?` | FK (relation à confirmer); nullable | Participant titulaire actuel du lot |
| `name` | `String` | requis (d’après le diagramme) | Nom affiché ou intitulé de l’élément |
| `description` | `String?` | nullable | Description libre |
| `position` | `Int` | requis (d’après le diagramme) | Ordre d’affichage |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### WorkPackageTradeCategory

**Description.** Relation N-N entre les lots et leurs catégories de métiers ; un lot peut combiner plusieurs métiers.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `workPackageId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Lot concerné |
| `tradeCategoryId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Catégorie métier associée |

> **Clé de jonction :** aucun `id` n’est dessiné ; privilégier une clé composée des deux références, à confirmer au moment de créer le modèle Prisma.

### WorkItem

**Description.** Ouvrage réel du chantier, sans prix universel. executions contient les suivis/checklists légères par organisation, embarqués en JSONB plutôt qu'en tables métier autonomes.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Chantier concerné |
| `workPackageId` | `String?` | FK (relation à confirmer); nullable | Lot concerné |
| `projectSpaceId` | `String?` | FK (relation à confirmer); nullable | Référence de ProjectSpace |
| `tradeCategoryId` | `String?` | FK (relation à confirmer); nullable | Catégorie métier associée |
| `sourceWorkTemplateId` | `String?` | FK (relation à confirmer); nullable | Référence de l’ouvrage de bibliothèque ayant servi à créer cette ligne (provenance) |
| `name` | `String` | requis (d’après le diagramme) | Nom affiché ou intitulé de l’élément |
| `description` | `String?` | nullable | Description libre |
| `quantity` | `Decimal` | requis (d’après le diagramme) | Quantité de travail |
| `unit` | `String` | requis (d’après le diagramme) | Unité de mesure (m², m³, ml, u, etc.) |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `executions` | `Json` | requis (d’après le diagramme); JSONB explicite | Checklists et avancements par organisation, structure JSON |
| `commercialPageId` | `String?` | FK (relation à confirmer); nullable | Page de présentation commerciale associée |
| `technicalPageId` | `String?` | FK (relation à confirmer); nullable | Page de documentation technique associée |
| `position` | `Int` | requis (d’après le diagramme) | Ordre d’affichage |
| `plannedStartDate` | `DateTime?` | nullable | Date de début planifiée pour l’ouvrage |
| `plannedEndDate` | `DateTime?` | nullable | Date de fin planifiée pour l’ouvrage |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### Reservation

**Description.** Réserve, anomalie ou problème sur chantier, associé éventuellement à un ouvrage/espace, avec visibilité client contrôlée.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Chantier concerné |
| `workItemId` | `String?` | FK (relation à confirmer); nullable | Ouvrage concerné |
| `spaceId` | `String?` | FK (relation à confirmer); nullable | Référence de ProjectSpace |
| `createdByOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation à l’origine de l’élément |
| `assignedOrganizationId` | `String?` | FK (relation à confirmer); nullable | Organisation chargée de résoudre la réserve |
| `clientVisible` | `Boolean` | requis (d’après le diagramme) | Autorise la visibilité de la réserve au client |
| `title` | `String` | requis (d’après le diagramme) | Titre |
| `description` | `String` | requis (d’après le diagramme) | Description libre |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `resolvedAt` | `DateTime?` | nullable | Date de résolution de la réserve |

### ProjectSnapshot **(OPTIONNEL / avancé)**

**Description.** OPTIONNEL. Photographie ponctuelle de l'état d'un chantier, sans event sourcing ; les documents contractuels restent historiques et indépendants.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Chantier concerné |
| `createdByUserId` | `String?` | FK (relation à confirmer); nullable | Utilisateur auteur / créateur de la ressource |
| `reason` | `String` | requis (d’après le diagramme) | Motif de la photographie du projet |
| `snapshot` | `Json` | requis (d’après le diagramme); JSONB explicite | Copie structurée d’un état du chantier |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |


## 04 · Bibliothèque et modèles

### LibraryFolder

**Description.** Dossier hiérarchique et privé de la bibliothèque d'ouvrages d'une organisation, sans dépendance avec les lots/espaces d'un chantier.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `parentId` | `String?` | FK (relation à confirmer); nullable | Référence à un parent de la même table (hiérarchie) |
| `name` | `String` | requis (d’après le diagramme) | Nom affiché ou intitulé de l’élément |
| `position` | `Int` | requis (d’après le diagramme) | Ordre d’affichage |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### WorkTemplate

**Description.** Ouvrage modèle privé réutilisable. Son insertion dans un chantier copie les données vers WorkItem ; modifier le modèle ne modifie pas les chantiers existants.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `folderId` | `String?` | FK (relation à confirmer); nullable | Référence de LibraryFolder |
| `tradeCategoryId` | `String?` | FK (relation à confirmer); nullable | Catégorie métier associée |
| `name` | `String` | requis (d’après le diagramme) | Nom affiché ou intitulé de l’élément |
| `description` | `String?` | nullable | Description libre |
| `unit` | `String` | requis (d’après le diagramme) | Unité de mesure (m², m³, ml, u, etc.) |
| `defaultTaxRate` | `Decimal?` | nullable | Taux de TVA proposé par défaut |
| `defaultUnitPrice` | `Decimal?` | nullable | Prix unitaire proposé par défaut |
| `estimatedUnitCost` | `Decimal?` | nullable | Coût unitaire estimé (privé) |
| `quantityExpression` | `String?` | nullable | Expression sécurisée de calcul automatique de quantité |
| `defaultChecklist` | `Json` | requis (d’après le diagramme); JSONB explicite | Checklist type utilisée lors de la création d’un ouvrage |
| `commercialPageId` | `String?` | FK (relation à confirmer); nullable | Page de présentation commerciale associée |
| `technicalPageId` | `String?` | FK (relation à confirmer); nullable | Page de documentation technique associée |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### TemplateMapping

**Description.** Correspondance enregistrée entre le modèle d'ouvrage d'une organisation et le modèle privé analogue d'un partenaire.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `sourceOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation source du mapping |
| `sourceTemplateId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Modèle source, pour provenance du snapshot ou mapping |
| `targetOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation partenaire destinataire du mapping |
| `localTemplateId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Modèle privé correspondant chez le partenaire / candidat |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |


## 05 · Consultations et offres

### Tender

**Description.** Consultation/appel d'offres d'une organisation. Les offres candidates restent isolées de la réalité du chantier jusqu'à attribution.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String?` | FK (relation à confirmer); nullable | Chantier concerné |
| `issuerOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation émettrice |
| `title` | `String` | requis (d’après le diagramme) | Titre |
| `description` | `String?` | nullable | Description libre |
| `visibility` | `Enum ou String` | requis (d’après le diagramme) | Règle de visibilité/publication (valeurs à définir) |
| `deadline` | `DateTime?` | nullable | Date limite de réponse |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### TenderPackage

**Description.** Association entre une consultation et un ou plusieurs lots du chantier.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `tenderId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Consultation associée |
| `workPackageId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Lot concerné |

> **Clé de jonction :** aucun `id` n’est dessiné ; privilégier une clé composée des deux références, à confirmer au moment de créer le modèle Prisma.

### TenderCandidate

**Description.** Entreprise invitée ou candidate à une consultation, avec suivi de l'invitation et de la réponse.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `tenderId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Consultation associée |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `invitedAt` | `DateTime?` | nullable | Date d’invitation |
| `respondedAt` | `DateTime?` | nullable | Date de réponse |

### TenderLine

**Description.** Travail demandé, figé à la publication de la consultation, sans dépendre des changements ultérieurs du projet.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `tenderId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Consultation associée |
| `sourceWorkItemId` | `String?` | FK (relation à confirmer); nullable | Ouvrage source, pour provenance du snapshot |
| `sourceTemplateId` | `String?` | FK (relation à confirmer); nullable | Modèle source, pour provenance du snapshot ou mapping |
| `description` | `String` | requis (d’après le diagramme) | Description libre |
| `quantity` | `Decimal` | requis (d’après le diagramme) | Quantité de travail |
| `unit` | `String` | requis (d’après le diagramme) | Unité de mesure (m², m³, ml, u, etc.) |
| `technicalPageId` | `String?` | FK (relation à confirmer); nullable | Page de documentation technique associée |
| `position` | `Int` | requis (d’après le diagramme) | Ordre d’affichage |

### Bid

**Description.** Offre globale remise par une entreprise en réponse à un Tender, avec historique commercial conservé à la soumission.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `tenderId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Consultation associée |
| `bidderOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation candidate |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `submittedAt` | `DateTime?` | nullable | Date de dépôt de l’offre |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### BidLine

**Description.** Ligne tarifée d'une offre candidate, pouvant correspondre à une ligne du Tender ou constituer un ajout, avec mapping facultatif de l'ouvrage privé.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `bidId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Offre candidate associée |
| `tenderLineId` | `String?` | FK (relation à confirmer); nullable | Ligne de consultation correspondante, si présente |
| `localTemplateId` | `String?` | FK (relation à confirmer); nullable | Modèle privé correspondant chez le partenaire / candidat |
| `description` | `String` | requis (d’après le diagramme) | Description libre |
| `quantity` | `Decimal` | requis (d’après le diagramme) | Quantité de travail |
| `unit` | `String` | requis (d’après le diagramme) | Unité de mesure (m², m³, ml, u, etc.) |
| `unitPrice` | `Decimal` | requis (d’après le diagramme) | Prix unitaire proposé |
| `taxRate` | `Decimal?` | nullable | Taux de TVA appliqué |
| `position` | `Int` | requis (d’après le diagramme) | Ordre d’affichage |


## 06 · Pages et fichiers

### Page

**Description.** Document riche attachable à un projet, lot ou ouvrage ; le propriétaire et la visibilité déterminent son accès.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `ownerOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation propriétaire du document/fichier |
| `projectId` | `String?` | FK (relation à confirmer); nullable | Chantier concerné |
| `workPackageId` | `String?` | FK (relation à confirmer); nullable | Lot concerné |
| `workItemId` | `String?` | FK (relation à confirmer); nullable | Ouvrage concerné |
| `type` | `Enum ou String` | requis (d’après le diagramme) | Catégorie fonctionnelle (valeurs à définir) |
| `visibility` | `Enum ou String` | requis (d’après le diagramme) | Règle de visibilité/publication (valeurs à définir) |
| `title` | `String` | requis (d’après le diagramme) | Titre |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### PageBlock

**Description.** Bloc ordonné (texte, titre, liste, image, fichier…) d'une page riche. Le contenu variable selon le type de bloc est en JSONB.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `pageId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Document/Page associé |
| `parentBlockId` | `String?` | FK (relation à confirmer); nullable | Bloc parent dans la page riche |
| `type` | `Enum ou String` | requis (d’après le diagramme) | Catégorie fonctionnelle (valeurs à définir) |
| `position` | `Int` | requis (d’après le diagramme) | Ordre d’affichage |
| `content` | `Json` | requis (d’après le diagramme); JSONB explicite | Contenu structuré du bloc de page |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### PageAudience

**Description.** Association des participants autorisés à une Page dont la visibilité est CUSTOM. L'accès interne dépend ensuite des memberships et affectations.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `pageId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Document/Page associé |
| `projectParticipantId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Référence d’une organisation participant au chantier |

> **Clé de jonction :** aucun `id` n’est dessiné ; privilégier une clé composée des deux références, à confirmer au moment de créer le modèle Prisma.

### FileAsset

**Description.** Métadonnées de fichier stocké hors PostgreSQL dans un stockage objet (S3 compatible) ; téléchargement via URLs signées après contrôle des droits.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `ownerOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation propriétaire du document/fichier |
| `storageKey` | `String` | requis (d’après le diagramme) | Clé d’objet dans le stockage externe |
| `filename` | `String` | requis (d’après le diagramme) | Nom original du fichier |
| `mimeType` | `String` | requis (d’après le diagramme) | Type MIME du fichier |
| `size` | `Int` | requis (d’après le diagramme) | Taille du fichier en octets |
| `createdByUserId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Utilisateur auteur / créateur de la ressource |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |


## 07 · Devis, factures et paiements

### Quote

**Description.** Devis entre organisations. Les snapshots figent les identités légales et fiscales à l'émission, et les lignes/montants sont conservés historiquement.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Chantier concerné |
| `issuerOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation émettrice |
| `recipientOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation destinataire |
| `issuerSnapshot` | `Json` | requis (d’après le diagramme); JSONB explicite; JSONB explicite | Copie figée des données d’identification de l’émetteur |
| `recipientSnapshot` | `Json` | requis (d’après le diagramme); JSONB explicite; JSONB explicite | Copie figée des données d’identification du destinataire |
| `type` | `Enum ou String?` | nullable | Catégorie fonctionnelle (valeurs à définir) |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `issuedAt` | `DateTime?` | nullable | Date d’émission du document |
| `validUntil` | `DateTime?` | nullable | Date limite de validité du devis |
| `acceptedAt` | `DateTime?` | nullable | Date de validation du devis ou de l’avenant |
| `acceptedBy` | `String (à confirmer)?` | nullable | Identifiant / signature de la personne ayant accepté le devis (type exact à confirmer) |
| `totalHT` | `Decimal` | requis (d’après le diagramme) | Montant total hors taxes figé |
| `totalTax` | `Decimal` | requis (d’après le diagramme) | Montant total des taxes figé |
| `totalTTC` | `Decimal` | requis (d’après le diagramme) | Montant total toutes taxes comprises figé |
| `terms` | `String?` | nullable | Clauses ou conditions contractuelles |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### QuoteLine

**Description.** Ligne immuable d'un devis ; le lien facultatif avec WorkItem ne sert qu'à la traçabilité, jamais au recalcul du passé.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `quoteId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Référence à quote |
| `workItemId` | `String?` | FK (relation à confirmer); nullable | Ouvrage concerné |
| `description` | `String` | requis (d’après le diagramme) | Description libre |
| `quantity` | `Decimal` | requis (d’après le diagramme) | Quantité de travail |
| `unit` | `String` | requis (d’après le diagramme) | Unité de mesure (m², m³, ml, u, etc.) |
| `unitPriceHT` | `Decimal` | requis (d’après le diagramme) | Prix unitaire hors taxes |
| `taxRate` | `Decimal` | requis (d’après le diagramme) | Taux de TVA appliqué |
| `totalHT` | `Decimal` | requis (d’après le diagramme) | Montant total hors taxes figé |
| `totalTax` | `Decimal` | requis (d’après le diagramme) | Montant total des taxes figé |
| `totalTTC` | `Decimal` | requis (d’après le diagramme) | Montant total toutes taxes comprises figé |
| `position` | `Int` | requis (d’après le diagramme) | Ordre d’affichage |

### PaymentSchedule

**Description.** Échéancier contractuel facultatif lié à un devis, distinct des paiements réels.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `quoteId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Référence à quote |
| `terms` | `String?` | nullable | Clauses ou conditions contractuelles |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### PaymentInstallment

**Description.** Échéance d'un devis (acompte, situation, solde), pouvant servir à créer une facture.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `paymentScheduleId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Échéancier auquel appartient l’échéance |
| `label` | `String` | requis (d’après le diagramme) | Libellé lisible |
| `percentage` | `Decimal?` | nullable | Pourcentage associé à une échéance |
| `amount` | `Decimal?` | nullable | Montant financier |
| `dueDate` | `DateTime?` | nullable | Date prévue de l’échéance |
| `trigger` | `Enum ou String?` | nullable | Événement déclenchant l’échéance |
| `position` | `Int` | requis (d’après le diagramme) | Ordre d’affichage |

### Invoice

**Description.** Facture indépendante, émise par une organisation à une autre ; snapshots d'identité à l'émission ; un devis peut générer plusieurs factures.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String?` | FK (relation à confirmer); nullable | Chantier concerné |
| `quoteId` | `String?` | FK (relation à confirmer); nullable | Référence à quote |
| `issuerOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation émettrice |
| `recipientOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation destinataire |
| `issuerSnapshot` | `Json` | requis (d’après le diagramme); JSONB explicite; JSONB explicite | Copie figée des données d’identification de l’émetteur |
| `recipientSnapshot` | `Json` | requis (d’après le diagramme); JSONB explicite; JSONB explicite | Copie figée des données d’identification du destinataire |
| `number` | `String` | requis (d’après le diagramme) | Numéro de facture |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `issuedAt` | `DateTime?` | nullable | Date d’émission du document |
| `dueAt` | `DateTime?` | nullable | Date d’échéance |
| `totalHT` | `Decimal` | requis (d’après le diagramme) | Montant total hors taxes figé |
| `totalTax` | `Decimal` | requis (d’après le diagramme) | Montant total des taxes figé |
| `totalTTC` | `Decimal` | requis (d’après le diagramme) | Montant total toutes taxes comprises figé |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### InvoiceLine

**Description.** Ligne figée de facture ; les références aux ouvrages/lignes de devis n'ont qu'un rôle de traçabilité.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `invoiceId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Facture associée |
| `workItemId` | `String?` | FK (relation à confirmer); nullable | Ouvrage concerné |
| `quoteLineId` | `String?` | FK (relation à confirmer); nullable | Ligne de devis d’origine, pour traçabilité |
| `description` | `String` | requis (d’après le diagramme) | Description libre |
| `quantity` | `Decimal` | requis (d’après le diagramme) | Quantité de travail |
| `unit` | `String` | requis (d’après le diagramme) | Unité de mesure (m², m³, ml, u, etc.) |
| `unitPriceHT` | `Decimal` | requis (d’après le diagramme) | Prix unitaire hors taxes |
| `taxRate` | `Decimal` | requis (d’après le diagramme) | Taux de TVA appliqué |
| `totalHT` | `Decimal` | requis (d’après le diagramme) | Montant total hors taxes figé |
| `totalTax` | `Decimal` | requis (d’après le diagramme) | Montant total des taxes figé |
| `totalTTC` | `Decimal` | requis (d’après le diagramme) | Montant total toutes taxes comprises figé |
| `position` | `Int` | requis (d’après le diagramme) | Ordre d’affichage |

### Payment

**Description.** Paiement réellement reçu/initié pour une facture chantier, indépendant du fournisseur technique de paiement.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `invoiceId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Facture associée |
| `provider` | `String` | requis (d’après le diagramme) | Prestataire externe (facturation/paiement) ou fournisseur |
| `providerPaymentId` | `String?` | nullable | Identifiant de la transaction chez le prestataire de paiement |
| `amount` | `Decimal` | requis (d’après le diagramme) | Montant financier |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `paidAt` | `DateTime?` | nullable | Date du paiement |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |


## 08 · Économie du projet

### WorkItemEconomics **(OPTIONNEL / avancé)**

**Description.** OPTIONNEL / AVANCÉ. Données économiques confidentielles propres à une organisation et un ouvrage ; aucune fuite vers les autres participants.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `workItemId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Ouvrage concerné |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `estimatedUnitCost` | `Decimal?` | nullable | Coût unitaire estimé (privé) |
| `plannedSellingUnitPrice` | `Decimal?` | nullable | Prix de vente unitaire prévisionnel (privé) |
| `committedUnitCost` | `Decimal?` | nullable | Coût unitaire engagé (privé) |
| `actualUnitCost` | `Decimal?` | nullable | Coût unitaire réel (privé) |
| `targetMargin` | `Decimal?` | nullable | Marge cible privée (préciser unité : taux ou montant) |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

> **Confidentialité :** toujours scoper l’accès par `organizationId` et vérifier les droits effectifs de l’utilisateur.

### WorkPackageEconomics **(OPTIONNEL / avancé)**

**Description.** OPTIONNEL / AVANCÉ. Coûts, marge cible et agrégats économiques privés d'une organisation sur un lot.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `workPackageId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Lot concerné |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `targetMargin` | `Decimal?` | nullable | Marge cible privée (préciser unité : taux ou montant) |
| `estimatedCost` | `Decimal?` | nullable | Coût estimé privé |
| `committedCost` | `Decimal?` | nullable | Coût engagé privé |
| `actualCost` | `Decimal?` | nullable | Coût constaté privé |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

> **Confidentialité :** toujours scoper l’accès par `organizationId` et vérifier les droits effectifs de l’utilisateur.

### ProjectFinancialSummary **(OPTIONNEL / avancé)**

**Description.** OPTIONNEL / CACHE. Synthèse financière pré-calculée par organisation et chantier. Les documents et lignes détaillées restent sources de vérité.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Chantier concerné |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `sellingHT` | `Decimal?` | nullable | Ventes HT agrégées |
| `sellingTTC` | `Decimal?` | nullable | Ventes TTC agrégées |
| `estimatedCost` | `Decimal?` | nullable | Coût estimé privé |
| `committedCost` | `Decimal?` | nullable | Coût engagé privé |
| `actualCost` | `Decimal?` | nullable | Coût constaté privé |
| `estimatedMargin` | `Decimal?` | nullable | Marge estimée privée |
| `committedMargin` | `Decimal?` | nullable | Marge engagée privée |
| `actualMargin` | `Decimal?` | nullable | Marge réalisée privée |
| `invoiced` | `Decimal?` | nullable | Montant facturé agrégé |
| `paid` | `Decimal?` | nullable | Montant payé agrégé |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

> **Confidentialité :** toujours scoper l’accès par `organizationId` et vérifier les droits effectifs de l’utilisateur.


## 09 · Abonnements plateforme

### Subscription

**Description.** Abonnement de l'organisation au SaaS BatiLib, distinct des paiements de factures chantier.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `organizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation concernée |
| `planId` | `String?` | FK (relation à confirmer); nullable | Offre commerciale SaaS associée |
| `provider` | `String` | requis (d’après le diagramme) | Prestataire externe (facturation/paiement) ou fournisseur |
| `providerCustomerId` | `String?` | nullable | Identifiant du client chez le prestataire de facturation SaaS |
| `providerSubscriptionId` | `String?` | nullable | Identifiant de l’abonnement chez le prestataire |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `currentPeriodEnd` | `DateTime?` | nullable | Fin de la période de facturation SaaS |
| `cancelAtPeriodEnd` | `Boolean?` | nullable | Résiliation programmée en fin de période |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### Plan **(OPTIONNEL / avancé)**

**Description.** OPTIONNEL. Offre commerciale de la plateforme. Les droits de fonctionnalités devraient découler de capacités explicites plutôt que de conditions codées sur le nom du plan.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `key` | `String` | requis (d’après le diagramme) | Clé stable d’identification |
| `name` | `String` | requis (d’après le diagramme) | Nom affiché ou intitulé de l’élément |
| `active` | `Boolean` | requis (d’après le diagramme) | Plan commercial disponible ou non |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### PlanEntitlement **(OPTIONNEL / avancé)**

**Description.** OPTIONNEL. Capacité, quota ou limite associée à une formule (projets, stockage, appels d'offres, etc.).

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `planId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Offre commerciale SaaS associée |
| `key` | `String` | requis (d’après le diagramme) | Clé stable d’identification |
| `value` | `Json` | requis (d’après le diagramme); JSONB explicite | Valeur de la variable ou du droit/entitlement |


## 10 · Demandes et modifications

### Request **(OPTIONNEL / avancé)**

**Description.** OPTIONNEL / PLUS TARD. Demande simple d'information, document ou validation entre participants d'un projet, sans mécanisme d'appel d'offres.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Chantier concerné |
| `issuerProjectParticipantId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Participant à l’origine de la demande |
| `recipientProjectParticipantId` | `String?` | FK (relation à confirmer); nullable | Participant destinataire de la demande |
| `type` | `Enum ou String` | requis (d’après le diagramme) | Catégorie fonctionnelle (valeurs à définir) |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `title` | `String` | requis (d’après le diagramme) | Titre |
| `description` | `String?` | nullable | Description libre |
| `dueAt` | `DateTime?` | nullable | Date d’échéance |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### ProjectChange **(OPTIONNEL / avancé)**

**Description.** OPTIONNEL. Option ou avenant proposé ; le chantier simple ne doit pas dépendre de cette abstraction.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Chantier concerné |
| `createdByOrganizationId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Organisation à l’origine de l’élément |
| `type` | `Enum ou String` | requis (d’après le diagramme) | Catégorie fonctionnelle (valeurs à définir) |
| `status` | `Enum ou String` | requis (d’après le diagramme) | État du cycle de vie (valeurs à définir) |
| `title` | `String` | requis (d’après le diagramme) | Titre |
| `description` | `String?` | nullable | Description libre |
| `proposedAt` | `DateTime?` | nullable | Horodatage de proposed |
| `acceptedAt` | `DateTime?` | nullable | Date de validation du devis ou de l’avenant |
| `createdAt` | `DateTime` | requis (d’après le diagramme) | Date de création |
| `updatedAt` | `DateTime` | requis (d’après le diagramme) | Date de dernière mise à jour |

### ProjectChangeItem

**Description.** Opération ADD/UPDATE/REMOVE d'un avenant. Le JSONB stocke la proposition sans toucher au chantier tant que le changement n'est pas accepté.

| Champ | Type Prisma suggéré | Particularités | Description du champ |
|---|---|---|---|
| `id` | `String` | PK (suggérée); requis (d’après le diagramme) | Identifiant technique unique de l’enregistrement |
| `projectChangeId` | `String` | FK (relation à confirmer); requis (d’après le diagramme) | Avenant contenant cette opération |
| `operation` | `Enum ou String` | requis (d’après le diagramme); valeurs : ADD | UPDATE | REMOVE | Opération proposée (ADD / UPDATE / REMOVE) |
| `workItemId` | `String?` | FK (relation à confirmer); nullable | Ouvrage concerné |
| `payload` | `Json` | requis (d’après le diagramme); JSONB explicite | Contenu figé de l’opération proposée |
| `position` | `Int` | requis (d’après le diagramme) | Ordre d’affichage |

---
## Incohérences et vérifications à faire avant génération de Prisma

- **Auth V0 versus Figma :** vérifier `User.name`, `User.emailVerified`, `User.image`, `User.role`, et les colonnes réellement créées par Better Auth et son plugin admin. Le diagramme Figma ne représente pas tous ces champs.
- **Session / Verification :** la carte Figma comporte des champs répétés ; les doublons ont été fusionnés ici. Vérifier si `Verification.userId` doit réellement exister.
- **Roles d’organisation :** décider si `OrganizationRole` / `permissions JSONB` reste la source des droits, ou si le MVP utilise des rôles fixes.
- **Enums métier :** les valeurs de `status`, `type`, `visibility`, `scope`, `trigger`, `targetRole` restent largement indéfinies.
- **Finance :** préciser devise, règles de taxe, arrondis, échelles des taux (`0.20` ou `20`) et valeurs de marges ; employer Decimal pour éviter les erreurs de flottants.
- **Cardinalités et intégrité :** envisager contraintes d’unicité pour membres/participants, FK et clés composites des tables d’association, ainsi que l’unicité du LEAD par projet.
- **Cycle de vie / historique :** verrouiller l’immuabilité des devis/factures/offres émis ; l’attribution dans WorkPackage ne contient que le titulaire courant.
- **Stockage :** `FileAsset.storageKey` pointe vers un objet externe (Cloudflare R2/S3 compatible), jamais des fichiers binaires dans PostgreSQL.

## Inventaire des tables incluses

`User`, `Account`, `Session`, `Verification`, `Organization`, `OrganizationRole`, `OrganizationMembership`, `OrganizationTradeCategory`, `BuildingProfessionalProfile`, `OrganizationInvitation`, `Subscription`, `Plan`, `PlanEntitlement`, `Project`, `ProjectParticipant`, `ProjectParticipantMember`, `ProjectInvitation`, `ProjectSpace`, `VariableDefinition`, `SpaceVariableValue`, `TradeCategory`, `WorkPackage`, `WorkPackageTradeCategory`, `WorkItem`, `Reservation`, `ProjectSnapshot`, `LibraryFolder`, `WorkTemplate`, `TemplateMapping`, `Page`, `PageBlock`, `PageAudience`, `FileAsset`, `Tender`, `TenderPackage`, `TenderCandidate`, `TenderLine`, `Bid`, `BidLine`, `Quote`, `QuoteLine`, `PaymentSchedule`, `PaymentInstallment`, `Invoice`, `InvoiceLine`, `Payment`, `Request`, `ProjectChange`, `ProjectChangeItem`, `WorkItemEconomics`, `WorkPackageEconomics`, `ProjectFinancialSummary`.

**Tables totalement exclues :** `Party`, `ProjectParticipation` (legacy), `ParticipationWorkPackage`. **Champs exclus :** `Project.clientPartyId`, `ProjectParticipantMember.projectId`, `ProjectParticipantMember.membershipId`, `PageAudience.partyId`, `Quote.issuerPartyId`, `Quote.recipientPartyId`, `Invoice.issuerPartyId`, `Invoice.recipientPartyId`, `Request.issuerPartyId`, `Request.recipientPartyId`.

**Fin du dictionnaire.**
