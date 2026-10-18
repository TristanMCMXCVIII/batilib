# BatiLib — contexte produit, architecture et état du développement

> **Document de passation aux agents de code — 17 octobre 2026.**
>
> Synthèse des discussions de conception Anaka V3 / Anacap V3 / BatiLib et des étapes de développement rapportées dans le chat. **Ce document n'a pas été produit par inspection du repository.** L'agent doit confronter ses affirmations au code, aux migrations et aux tests avant d'agir.
>
> Conventions de statut : **FAIT / TESTÉ** = déclaré fonctionnel manuellement dans le chat ; **À VÉRIFIER** = modifié ou proposé, mais sans preuve fiable d'état final ; **ENVISAGÉ** = vision cible sans implémentation ; **À TRANCHER** = décision non arrêtée.

## 1. Vision du produit

**BatiLib** est le nom de travail du futur SaaS issu de l'application métier d'**Anaka**, entreprise de rénovation/contractant général. Le projet a été appelé **Anaka V3**, parfois **Anacap V3**, avant « BatiLib ». Le nom commercial final et le domaine **ne sont pas validés** (le domaine souhaité était déjà pris).

Le logiciel vise à devenir une **source de vérité partagée autour du chantier**, reliant entreprise pilote, salariés, clients, artisans, sous-traitants et, à terme, fournisseurs. Le point d'entrée doit être extrêmement simple pour un petit artisan ; les fonctions avancées de coordination, chiffrage, pièces, lots et collaboration doivent être disponibles **sans compliquer son parcours**.

Historique Anaka (ordres de grandeur communiqués lors des échanges, pas des métriques système vérifiées) : environ 50–60 chantiers/an, quelques chantiers simultanés, équipe interne réduite et plusieurs entreprises sous-traitantes ; logiciel précédent sur Bubble permettant édition accélérée, devis, suivi de travaux, échanges, documents, réserves, visualisation client. La collaboration et la traçabilité font partie de la valeur cœur. Le produit doit rester **générique**, pas dépendre de règles propres à Anaka.

**Objectifs :** réduire les tâches administratives et les quiproquos, chiffrer/organiser un projet, partager l'avancement et les documents selon les autorisations, permettre aux intervenants d'indiquer les travaux effectués. Priorité à la coordination et à l'adoption terrain, pas à un ERP/CRM exhaustif dès la première version. La plateforme web est prioritaire ; application mobile envisagée ensuite.

### Deux niveaux de complexité d'usage

- **Parcours artisan prioritaire** : inscription → client → chantier/projet → ouvrages → devis → facture (et paiement plus tard). Aucun besoin d'exposer lots, sous-traitance et espaces complexes si non pertinents.
- **Parcours orchestrateur/contractant** : projet multi-espaces, lots/métiers, salariés, invitations externes, appels d'offres, offres de sous-traitants, documents, tâches, réserves, planning, budgets, marges, suivi partagé.

La V0 technique actuelle ne doit **pas encore implémenter ces parcours métier** ; elle fournit le socle des identités et de l'application.

## 2. Décisions techniques ACTUELLES : socle V0

| Sujet | Implémentation actuelle rapportée |
| --- | --- |
| Dépôt | Un seul dépôt Git GitHub, deux dossiers `frontend/` et `backend/` ; pas de Turborepo ni de `packages/` partagés |
| Frontend | Next.js App Router, TypeScript, React, Tailwind ; `frontend/app/` à la racine (pas de dossier `src/`) ; Next observé en 16.3.6 |
| Backend | NestJS observé 12.1.1, `FastifyAdapter`, TypeScript ESM/NodeNext, port local 3001 |
| DB | PostgreSQL 17 Docker Compose, base locale `batilib`, port hôte **5433 lors des derniers tests** (le fichier Compose et les `.env` font foi) |
| ORM | Prisma 7.10 (`prisma` et `@prisma/client` alignés), adaptateur PostgreSQL `@prisma/adapter-pg` + driver `pg` |
| Prisma config | `backend/prisma7.config.ts` selon les logs ; schéma `backend/prisma/schema.prisma` ; client généré dans `backend/src/generated/prisma` |
| Auth | Better Auth, **exécuté côté serveur Next**, pas à l'intérieur de Nest pour l'instant |
| Accès Better Auth à la DB | `Pool` du driver `pg` dans `frontend/lib/auth.ts`, pointant sur la même DB que Prisma, mais avec configuration séparée |
| OAuth | Google opérationnel, email+mot de passe opérationnel ; linking conditionné à la vérification de l'email |
| Email | Brevo API transactionnelle via `frontend/lib/mail/send-email.ts` ; OTP par Better Auth Email OTP |
| Admin | Rôles plateforme `user` / `admin`, Better Auth Admin plugin, `/admin` réservé aux admins |
| UI | Minimaliste, blanc/gris/noir, inspiration ChatGPT ; CSS Tailwind ; pas de design system complet |
| Déploiement | Pas de CI/CD, microservices, marketing séparé, mobile, Redis ou queues à ce stade |

**Important :** Next et Nest se connectent directement à la même base dans la V0. Cela fonctionne pour démarrer, mais implique **deux couches d'accès DB** et un enjeu futur d'alignement des modèles et contrôles d'autorisation. Ne pas présenter Nest comme vérifiant déjà les sessions Better Auth. Lors de la construction d'API métier Nest, définir/implémenter cette frontière d'authentification explicitement.

### Schéma technique des connexions actuelles

```text
Navigateur
   |
   +--> Next.js (localhost:3000)
   |       |-- pages /login /register /app /admin /profile
   |       |-- Better Auth + plugins admin, emailOTP
   |       |-- Next Route /api/auth/[...all]
   |       |-- pg Pool -------------------------------+
   |       +-- Brevo API pour email OTP              |
   |                                                 v
   +--> Nest/Fastify API (localhost:3001) --> Prisma --> PostgreSQL (Docker, hôte :5433)
                         [auth métier Nest à construire]
```

### Schéma d'identité (créé par migrations)

Les modèles de base confirmés par Prisma Studio :

- `User` : personne, `id`, `name`, `email` unique, `emailVerified`, `image` (URL), `role` (`PlatformRole` : `user` / `admin`), dates. Champs additionnels du plugin admin : `banned`, `banReason`, `banExpires`.
- `Account` : identité d'un fournisseur (mot de passe = provider `credential` selon la configuration observée ; Google = `google`), liaisons au même `User`, jetons OAuth éventuels et hachage mot de passe gérés par Better Auth.
- `Session` : sessions utilisateur, tokens, expiration, navigateur/IP, `impersonatedBy` pour plugin admin.
- `Verification` : enregistrements de vérification.

**Rôles plateforme** = permissions d'administration du SaaS (`user`, `admin`) et **ne doivent pas être confondus** avec les futurs rôles de membre d'entreprise/projet. Le rôle est initialisé à `user`, non éditable librement à l'inscription (`input: false` en champ additionnel Better Auth). Tout changement de rôle doit être réalisé par une action admin protégée.

### Fichiers clés à retrouver dans le dépôt

```text
frontend/
  app/
    page.tsx
    login/page.tsx
    register/page.tsx
    verify-email/page.tsx
    auth/error/page.tsx
    auth/verify-existing-account/page.tsx
    api/auth/[...all]/route.ts
    app/page.tsx
    admin/page.tsx
    profile/page.tsx
  components/
    auth/logout-button.tsx
    profile/profile-client.tsx
  lib/
    auth.ts
    auth-client.ts
    mail/send-email.ts
  .env.local                  # JAMAIS versionner
backend/
  src/
    main.ts                   # Nest + FastifyAdapter ; port 3001
    app.module.ts
    prisma/prisma.module.ts
    prisma/prisma.service.ts
    generated/prisma/         # code Prisma généré
    users/                    # module Nest créé pour tester Prisma
  prisma/
    schema.prisma
    migrations/
  prisma7.config.ts           # vérifier son nom exact dans le dépôt
  .env                        # JAMAIS versionner
compose.yaml
```

Ce schéma est un **inventaire rapporté**, non un plan impératif de dossiers. L'agent doit inspecter la structure réelle avant toute modification. `CLAUDE.md` peut importer `AGENTS.md` pour les agents Claude Code.

### Environnement et commandes

- `frontend/.env.local` : `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BREVO_API_KEY`, `BREVO_SENDER_NAME`, `BREVO_SENDER_EMAIL` ; garder toutes les valeurs secrètes hors Git. Vérifier qu'elles sont réellement utilisées avant de les renommer. Aucun `NEXT_PUBLIC_` pour ces secrets.
- `backend/.env` : `DATABASE_URL`, même DB/port que Better Auth ; les identifiants de dev sont provisoires.
- Démarrer PostgreSQL depuis racine : `docker compose up -d` ; vérifier `docker compose ps`.
- Frontend : `cd frontend && pnpm dev` ; backend : `cd backend && pnpm start:dev`.
- DB : depuis `backend/`, `pnpm prisma validate`, `pnpm prisma migrate status`, `pnpm prisma generate` ; `pnpm prisma migrate dev --name ...` seulement pour une migration nécessaire.
- Attention à l'ancien conteneur `wilden-app` qui prenait le port 3001 ; il avait fallu le stopper. **Ne jamais stopper aveuglément un autre projet** en prod.
- Node ESM backend : imports relatifs `./foo.js` même lorsque le fichier source se nomme `foo.ts` ; cela a été une source initiale d'erreurs TS2307/TS2835. Le client Prisma a été déplacé sous `src/generated/prisma/` pour éviter `TS6059: not under rootDir`.
- Après modification des `.env.local` ou de la config Better Auth, redémarrer Next. Les changements de plugins Better Auth doivent être synchronisés avec le schéma Prisma/migrations : une erreur `Database schema mismatch` avait nécessité un redémarrage Next.

## 3. État fonctionnel de la V0 — au 17 octobre 2026

| Fonction | Statut d'après les tests en conversation | Notes |
| --- | --- | --- |
| Next.js + Nest/Fastify + PostgreSQL | **FAIT / TESTÉ** | Le backend et le frontend démarrent ; DB vérifiée |
| Prisma migrations + `User`, `Account`, `Session`, `Verification` | **FAIT / TESTÉ** | Tables visibles dans Prisma Studio |
| Inscription email/password | **FAIT / TESTÉ** | Création User/Account/Session |
| Connexion email/password et déconnexion | **FAIT / TESTÉ** | Bouton signOut fonctionnel |
| Connexion et création de compte Google | **FAIT / TESTÉ** | Identité Google connue, nom/email/photo gérés par Better Auth |
| Linking du provider Google à un utilisateur email/password vérifié | **FAIT / TESTÉ** sur un compte | Google `account_not_linked` observé si email local non vérifié ; scénario complet d'erreur reporté pour recette |
| Vérification email par OTP | **FAIT / TESTÉ** | Code reçu via Brevo, validé, `emailVerified=true` dans Prisma Studio |
| Renvoyer l'OTP | **À VÉRIFIER** | Code présenté et accepté, mais test de cooldown/anti-abus non confirmé |
| Blocage `/app` si non connecté / email non vérifié | **FAIT / TESTÉ** pour session, **À VÉRIFIER** pour toutes branches/sous-routes | Contrôle dans Server Components |
| `/admin` + rôle global admin | **FAIT / TESTÉ** | Accès admin validé après modification du rôle dans Prisma Studio |
| Liste utilisateurs admin | **FAIT / TESTÉ** après correction/redémarrage | `auth.api.listUsers()` côté serveur ; plafond de pagination par défaut à prendre en compte |
| Erreur OAuth custom `/auth/error` | **À VÉRIFIER** | Page créée avec `errorCallbackURL`; parcours complet `account_not_linked` à refaire |
| Page `/auth/verify-existing-account` | **À VÉRIFIER** | Formulaire email → OTP → page verify; scénario Google non revérifié |
| `/profile` avec identité, photo Google, méthodes de connexion | **FAIT / TESTÉ** pour affichage méthodes | Deux méthodes seulement : mot de passe et Google |
| Changement de nom (`updateUser`) | **À VÉRIFIER** | Code proposé en fin de session, implémentation effective non confirmée |
| Photo personnalisée | **À FAIRE** | Le champ URL/photo Google est déjà disponible ; pas encore d'upload |
| Changement de mot de passe | **À FAIRE** | Prévoir cas utilisateur Google sans password |
| Changement d'email avec vérification | **À FAIRE** | Ne jamais effectuer un changement non vérifié |
| Suppression compte avec confirmation | **À FAIRE** | Tenir compte des données chantier/entreprise et droits de conservation avant lancement réel |
| API Nest authentifiée / droits métier | **NON FAIT** | L'ancien `GET /users` public a existé ; audit suppression/fermeture requis |
| Route test Brevo `/api/test-email` | **À VÉRIFIER / À SUPPRIMER** | Route temporaire de test par GET, **ne pas la garder exposée** |
| Front UX/layout global complet | **NON FAIT** | Coque minimale, refactor souhaité ultérieurement avec agent |
| Tests automatisés auth/perms + recette globale | **NON FAIT** | À mettre avant toute mise en production |

### Exigences importantes pour l'auth à consolider

- **Une personne = un `User`, plusieurs moyens d'auth = plusieurs `Account`** (`credential` et/ou `google`). Pas de second utilisateur lorsque Google est correctement lié au compte existant.
- Google peut apporter `name`, `email`, `image`, `emailVerified` pour un nouveau compte. Ne pas séparer `firstName`/`lastName` maintenant ; seul `name` est demandé.
- Sur un compte existant, préserver le nom/photo choisis localement plutôt que d'écraser automatiquement lors du linking, sauf choix UX explicite.
- Pour l'inscription locale, un code OTP d'email (6 chiffres, durée configurée ~5 min) vérifie la propriété de l'adresse. `autocomplete="one-time-code"`, `inputMode="numeric"` sur le champ.
- Tant que `emailVerified` est faux, bloquer les pages privées (`/app`, `/admin`, `/profile` et futures routes). Vérifier **la politique réelle côté API** : les contrôles de pages seuls ne protègent pas les actions HTTP sous-jacentes.
- `account_not_linked` arrive notamment quand un compte email/password existant non vérifié rencontre pour la première fois Google avec le même email : afficher une page Batilib, proposer d'entrer son email, envoyer OTP, vérifier et retenter Google. Un compte **déjà lié** à Google n'est pas un test de ce scénario.
- Ne pas présumer que Google est lié à partir du même email sans les conditions de vérification et la politique Better Auth. Faire la recette sur un jeu de données propre.
- Confirmer la mise en œuvre réelle de `requireEmailVerification` / des interdictions de connexion côté auth selon version Better Auth ; éviter qu'une session créée à l'inscription ne donne un accès métier avant vérification.
- Rate limiting OTP, renvoi avec délai, prévention de l'énumération d'adresses, état de chargement, messages d'erreur compréhensibles, invalidation correcte de session, robustesse multi-onglet. Les parcours Google et OTP doivent être testés sur les variantes importantes.
- Google, mot de passe uniquement **pour l'instant**. Apple, LinkedIn, Microsoft, Facebook pourront éventuellement venir plus tard, **ne pas les afficher même désactivés dans le profil de la V0**.

## 4. Modèle métier CIBLE (conceptuel, pas encore implémenté)

> **Ne pas créer toutes ces tables dans la V0**. Cette section documente les décisions de conception pour orienter les fondations. Noms exacts et cardinalités devront être revus lors de la phase métier.

### Identité, entreprise et rôle

- `User` = personne. Identité et sessions communes, quel que soit le contexte de projet.
- `Organization` = entreprise/entité professionnelle (multi-tenant). Ne jamais confondre utilisateur et entreprise.
- `OrganizationMembership` = appartenance d'une personne à une entreprise ; un utilisateur peut à terme être membre de plusieurs organisations (les parcours UX exacts restent à confirmer).
- `OrganizationRole` / permissions configurables éventuelles = capacités de l'utilisateur au sein de son organisation. Un propriétaire d'entreprise n'est pas automatiquement un administrateur global de la plateforme.
- `ProjectAssignment` = quels collaborateurs de l'entreprise ont accès à tel projet.
- `ProjectParticipation` = participation d'une autre organisation à un projet, avec périmètre (par exemple lots attribués ou accessibles) ; possibilité d'affecter des utilisateurs de cette organisation.
- Pour l'UX, distinguer probablement espace **professionnel** et expérience **client** selon la nature de l'acteur ; c'est un sujet encore en construction, pas une décision DB à figer maintenant.

### Projet, espaces, lots et ouvrages

- **1 chantier physique = 1 `Project` partagé**, avec organisation propriétaire/pilote, client(s), collaborateurs internes et organisations externes selon droits. Ne pas dupliquer un projet en un projet par sous-traitant.
- `Client` / relation client (éventuellement organisation de type client) lié au projet ; modélisation à finaliser.
- `ProjectSpace` hiérarchique, par exemple étage → pièce/zone ; variables et mesures/surfaces utiles aux quantités. Les formules avancées restent **optionnelles et à trancher**, ne pas les imposer à chaque artisan.
- `TradeCategory` = référentiel universel des métiers/catégories, indépendant d'une entreprise.
- `WorkPackage` / lot = **facultatif**, regroupement libre d'ouvrages pour pilotage, estimation, attribution et appel d'offres ; liaison métier éventuelle ; il ne doit pas rigidifier le parcours simple.
- `WorkItem` = ouvrage réel d'un projet. Représentable **par espace** ou **par lot** sans dupliquer la donnée ; quantité, unité, description enrichie, suivi/exécution, éventuellement dates de planning. L'ouvrage ne contient pas de « prix universel » visible par tous.
- Bibliothèque réutilisable (`WorkTemplate` / dossiers de bibliothèque / modèles d'ouvrages). On peut créer librement un ouvrage sur un chantier, puis l'ajouter **optionnellement** à la bibliothèque.
- Tâches/checklists liées aux ouvrages pour l'avancement ; de simples exécutions peuvent être stockées dans `WorkItem` (`executions` JSONB ciblé, selon décision de conception), tandis que les vraies tâches transversales et attribuables peuvent être relationnelles. Statut et progrès partagés de façon contrôlée.
- Possibilités futures : réserves, modifications/avenants, documents, pages riches, commentaires, notifications, snapshots.

### Chiffrage, documents et contractualisation

- Coûts, prix d'achat, prix de vente, marges et détails d'offres sont **propres à chaque organisation et à chaque relation commerciale** : pas de prix universel dans une fiche ouvrage partagée à tous.
- Devis (`Quote`) et factures (`Invoice`) sont **documents métier et contractuels**, avec **snapshots des lignes, quantités et prix au moment de l'émission** pour préserver l'historique. Le devis émis ne doit pas changer silencieusement quand l'ouvrage source change. Acomptes, échéanciers, pénalités et paiements = conception encore à poursuivre.
- Sous-traitance : `Tender` / appel d'offres et `Bid` / proposition séparés du noyau projet ; lien entre ouvrages/proposition sous-traitant et ouvrages maître d'œuvre **à concevoir soigneusement**. Une attribution acceptée pourra modifier l'affectation du lot, sans que les offres non retenues perturbent le projet.
- La plateforme doit permettre à un sous-traitant de voir **son** lot/proposition, les éléments nécessaires pour exécuter, et de considérer le contractant comme client direct ; aucun accès implicite aux marges et achats du contractant principal.
- Documents/pages enrichies : métadonnées et droits dans PostgreSQL ; objets et fichiers dans stockage compatible **S3** à terme ; PDF (DPGF, devis, factures, etc.) générés côté serveur à partir de HTML mis en page, avec contrôle des sauts de page et images. Pas d'objets binaires volumineux directement en colonnes PostgreSQL.
- PostgreSQL + JSONB ciblé pour champs réellement flexibles (blocs riches, variables/configs, snapshots, exécutions, règles flexibles) ; **pas de NoSQL** nécessaire a priori.

### Permissions : modèle cible important

Le système doit rester **simple à comprendre côté UX, strict côté serveur** :

```text
User -- OrganizationMembership --> OrganizationRole (actions / habilitations)
                         |
                  ProjectAssignment (projets du collaborateur)
                         |
Project <-- ProjectParticipation -- Organization externe
                         |
                    périmètre des lots/ouvrages accessibles
                         |
                    visibilité effective des ressources
```

Principes validés lors des échanges :

1. **Rôle de l'organisation = quelles actions ?** (ex.: voir coûts, éditer ouvrages, piloter utilisateurs).
2. **Affectation projet = sur quels projets ?**
3. **Participation / lot = sur quel périmètre partagé ?**
4. `WorkItem`, sous-tâches, checklists et réserves héritent normalement de cet accès ; **ne pas créer une ACL par ouvrage/tâche** sans besoin concret.
5. Documents : exception possible avec audience/visibilité explicitement paramétrables.
6. Le serveur décide des droits et filtre **dès la requête DB** puis via **DTO/projections** ; ne jamais récupérer toutes les données de prix et masquer uniquement des colonnes dans le navigateur.
7. Coûts, marges, prix d'achat et propositions des sous-traitants sont protégés séparément des données opérationnelles : un salarié peut cocher une tâche sans lire une marge, un client voit son devis sans la ventilation interne, un sous-traitant voit ses montants et pas ceux du concurrent.
8. Les permissions globales `user/admin` de Better Auth ne sont **pas** le système métier ci-dessus.

`OrganizationRole.permissions` en JSONB, `ProjectAssignment`, `ProjectParticipation` et relations lot/participation ont été discutés comme manière compacte d'obtenir ces droits hérités. **Le détail du DSL des permissions et les noms des tables ne sont pas définitivement figés.** Avant d'implémenter : concevoir un service d'autorisation central (`can(...)`), des guards Nest et des requêtes filtrées ; écrire des tests d'isolation interentreprises et de confidentialité financière.

## 5. UX cible et navigation (à ne pas confondre avec les écrans V0)

- Une application web cohérente, Next.js + Tailwind, UI simple dans l'esprit **ChatGPT (noir, blanc, gris)** pour les premiers travaux ; branding final non arrêté. Des propositions plus anciennes bleu nuit/bleu clair/CTA jaune-orangé ne sont **pas** un système de design définitivement imposé.
- Projet = centre de l'expérience. Proposition de navigation : rail global, menu projet **Vue d'ensemble / Chantier / Planning / Suivi / Commercial / Documents / Participants / Paramètres** ; certains onglets s'affichent selon permission/phase du projet. À confirmer pendant la conception.
- Vue d'ouvrages par espace et par lot sur **les mêmes `WorkItem`**. Éditeur riche pour descriptions/images et PDF fiable ; éléments courts/actions simples dans panneaux, gros objets contractuels sur pages dédiées.
- Planning calendrier/Gantt possible plus tard à partir de champs dates sur `WorkItem` ou périmètre équivalent ; complexité à cadrer (ne pas en faire un ERP planning en V0).
- L'app mobile viendra plus tard ; pistes de navigation mobile : Aujourd'hui / Projets / Activité / Plus, à confirmer.
- Multiples profils : petit artisan, responsable projet, salarié terrain, partenaire/sous-traitant, client. Le salarié peut valider des travaux en quelques clics sans voir des prix privés.
- L'application publique pourrait plus tard vivre sur `app.<domaine>` avec site marketing séparé, ou sous un domaine unique. **Aucun domaine ni site marketing n'est à créer par défaut aujourd'hui** ; nom « BatiLib » provisoire.

## 6. Roadmap et limites de périmètre

### V0 technique en cours (prioritaire)

- Auth email/password + Google, OTP email Brevo, users/accounts/sessions, rôle plateforme `user/admin`, profil, interface d'administration.
- Une app Next et un serveur Nest, base PostgreSQL unique, Git unique. **Aucune feature chantier complexe requise**.
- Refactor structurel de `components`, `lib`, guards/layouts plus tard avec agent, sans casser ce qui fonctionne.
- Tests de sécurité/recette avant exposition publique ; aucune promesse de « production ready » sur la seule base des tests manuels.

### Prochain incrément métier (après validation UX)

- `Organization` / `OrganizationMembership`, puis `Client`, `Project`, `WorkItem` dans un parcours artisan ultra simple. Ensuite devis/facture avec snapshots. Introduire progressivement bibliothèque, espaces, tâches, documents et invitations.
- Parcours pilote Anaka permettant de tester coordination et visibilité différenciée.

### Incréments avancés (progressifs)

- Lots facultatifs, professions/TradeCategory, espaces/variables, quantitatif et formules, tâches/réserves, appels d'offres/propositions/attributions et mapping entre ouvrages, PDF enrichis, planning, notifications, abonnements, paiement, IA, mobile.
- Éviter de « pré-construire » des architectures de microservices, Redis, queues, marketing et CI/CD sans nécessité mesurée.

### Tarification exploratoire — pas de code de facturation à bâtir maintenant

Discussions indicatives : abonnement artisan autour de **29–49 €/mois**, orchestrateur/contractant plus important autour de **150 €/mois** (à recalibrer selon valeur/périmètre) ; des invités, clients et sous-traitants pourraient collaborer sans abonnement propre pour éviter de bloquer l'adoption. Modèle de quotas, rôles facturables et offres **non arrêtés**.

## 7. Décisions ouvertes — ne pas figer silencieusement

- Nom commercial, domaine, architecture finale site public vs app, charte visuelle définitive.
- Distinction UX/DB entre comptes professionnels et clients ; multi-organisation, changement d'univers et invitations.
- Qui est propriétaire de quoi pour les devis/factures et transactions lorsque plusieurs entreprises opèrent sur un même projet ; conséquences légales de suppression de compte.
- Modèle détaillé des variables/formules de quantitatif, surfaces, pièces et quantités.
- Nature relationnelle vs JSONB de certaines exécutions/tâches, progression, optionalité des tâches liées à ouvrage.
- Correspondance/attribution entre ouvrages internes Anaka et propositions externes sous-traitants (sujet majeur de conception), snapshots et adaptations au chantier.
- Acomptes, échéanciers, factures, relances, pénalités, paiements, avenants/réserves.
- Moteur de permissions précis (droits configurables, appartenance multiple, exceptions documents) et contrats DTO.
- Compatibilité de l'auth Next avec API Nest et ultérieure application mobile ; cookies, origines, mécanisme de session, CORS/CSRF, sécurité machine-to-machine.
- Stockage photo et fichiers (S3 ou équivalent), export/suppression des données, conformité RGPD, stratégies de rétention.
- Fournisseur email à long terme (Brevo validé V0, échange possible grâce à l'abstraction du mailer) ; séparation transactionnel/newsletter.

## 8. Critères de qualité et recette avant première mise en production

**Authentification/compte** : inscription, OTP valide/invalide/expiré, renvoi et limitation, email vérifié/non vérifié, reconnection, mot de passe faux/oublié, Google premier passage et compte déjà lié, linking sécurisé, `account_not_linked`, changement email/mot de passe, photo, suppression de compte, sessions révoquées, rôle et interdiction d'auto-promotion admin.

**Sécurité** : routes frontend et API protégées, aucun accès public à la liste d'utilisateurs, protection serveur des données, pas d'énumération d'emails, CSRF/cookies/OAuth state, limites d'envoi Brevo, secrets hors Git, migration reproductible sur base de test, audit de dépendances et tests d'autorisation tenant/finances avant les premiers vrais chantiers.

**Exploitation** : erreurs compréhensibles, logs sans secrets, backup et restauration DB, migrations avant déploiement, variables d'environnement documentées sans credentials, configuration DNS/Google/Brevo pour le véritable domaine lorsqu'il sera acheté.

## 9. Consignes pour l'agent qui reprend le dépôt

1. Inspecter d'abord la branche courante, la structure, les scripts, les migrations, la configuration auth et les modifications non commitées. Ne pas présumer que les exemples ci-dessus sont encore exacts.
2. Identifier une fonctionnalité à la fois et l'implémenter de bout en bout sans refactor hors périmètre ; expliquer au propriétaire les décisions importantes de façon courte et didactique.
3. Garder l'auth côté Next tant que ce choix n'est pas explicitement revu. Construire l'autorisation métier côté serveur avant de développer des données sensibles sur Nest.
4. Pour la page compte V0 : `name` seul (pas first/last), photo, statut des **deux méthodes existantes** (mot de passe, Google), ajout/dissociation sécurisé si demandé, changement email/password, suppression avec confirmation. Aucune ligne de méthode Apple/Microsoft/LinkedIn/Facebook même en placeholder.
5. Avant d'annoncer « terminé », indiquer les commandes/tests réellement exécutés et les scénarios non vérifiés ; mettre à jour les statuts de ce document en fonction des résultats observés.
