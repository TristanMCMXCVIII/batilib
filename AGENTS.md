# AGENTS.md — BatiLib / Anaka V3

> Instructions durables pour les agents de développement (Codex, Claude Code, etc.).
> Dernière mise à jour : 17 octobre 2026. **L'état réel du dépôt fait foi** si ce document diverge du code.

## Mission

BatiLib (nom de travail ; historiquement « Anaka V3 » / « Anacap V3 ») est un SaaS de gestion et de coordination de chantiers de rénovation, utilisable aussi bien par un petit artisan que par une entreprise orchestrant plusieurs intervenants. L'application doit être simple en surface, évolutive dans sa structure et très rigoureuse sur les autorisations, les données interentreprises et les données financières.

**Lire `docs/PROJECT_CONTEXT.md` pour une tâche qui touche au modèle métier, aux droits, au produit, à la roadmap ou à la configuration de l'authentification.** Pour une correction locale simple, lire seulement le code pertinent. Le document distingue l'implémenté, le cible et le non tranché.

## État et architecture du dépôt

Un **seul dépôt Git classique**, sans monorepo sophistiqué :

```text
/
├── frontend/           # Next.js App Router + React + TypeScript + Tailwind
├── backend/            # NestJS + FastifyAdapter + TypeScript ESM
├── compose.yaml        # PostgreSQL local dans Docker
├── AGENTS.md
└── docs/PROJECT_CONTEXT.md
```

- **Frontend** : Next.js (observé : 16.3.6), App Router dans `frontend/app/` (pas de `src/`), Tailwind. UI sobre, noire/blanche/grise, proche de ChatGPT ; ne pas inventer de design system complexe pour la V0.
- **Backend** : NestJS (observé : 12.x) avec `@nestjs/platform-fastify`, API HTTP modulaire, ESM/NodeNext. Dans les imports **relatifs** TypeScript du backend, utiliser l'extension `.js` lorsqu'exigée par NodeNext.
- **Base** : PostgreSQL 17 via Docker Compose (dans le dernier environnement local, port hôte **5433**, à vérifier avec `compose.yaml` et les `.env`). Une seule base de données pour l'auth et les données métier.
- **ORM backend** : Prisma 7.10, driver `@prisma/adapter-pg` ; modèle dans `backend/prisma/schema.prisma`, config observée `backend/prisma7.config.ts`, client généré dans `backend/src/generated/prisma/` pour respecter le `rootDir: src` de Nest. Ne jamais éditer manuellement le client généré.
- **Authentification** : Better Auth est **hébergé côté serveur Next.js**, via `frontend/lib/auth.ts`, route `frontend/app/api/auth/[...all]/route.ts`, client `frontend/lib/auth-client.ts`. Better Auth se connecte directement à la même PostgreSQL par `pg`; Nest utilise Prisma. Ne pas créer une seconde base d'utilisateurs.
- **Email** : Brevo API transactionnelle, fonction `frontend/lib/mail/send-email.ts`. OTP email via plugin Better Auth ; templates encore simples. La clé est côté serveur uniquement.
- **Git / déploiement** : GitHub est initialisé ; pas de CI/CD complexe, pas de microservices, pas de Turborepo, pas de site marketing séparé pour l'instant. Le produit pourra être déployé en composants indépendants plus tard.

## Commandes usuelles (à confirmer avec les `package.json` du dépôt)

```bash
# à la racine

docker compose up -d
# dans frontend/
pnpm dev
pnpm lint                    # si le script existe
pnpm build
# dans backend/
pnpm start:dev
pnpm build
pnpm prisma validate
pnpm prisma migrate status
pnpm prisma generate
# seulement lors d'un changement de schéma, après inspection de l'impact :
pnpm prisma migrate dev --name <nom_descriptif>
```

Installer les dépendances avec `pnpm` **depuis le sous-projet concerné** (`frontend` ou `backend`), pas systématiquement à la racine. Pas de dépendances globales inutiles. Vérifier les scripts réels avant exécution.

## Règles de développement

1. **Commencer par inspecter l'existant**, notamment `package.json`, migrations, services, composants et tests. Ne pas recréer ce qui fonctionne déjà. Les chemins/versions ci-dessus sont un état historique, pas une garantie d'exactitude actuelle.
2. **Faire des changements petits et ciblés** : pas de réorganisation massive ni de nouveau framework sans besoin concret ou validation de l'utilisateur.
3. **Expliquer brièvement en français** ce qui a changé et pourquoi, puis donner les commandes/tests exécutés et leurs résultats. L'utilisateur est développeur, revient au code après une période no-code et souhaite comprendre sans longs cours.
4. Respecter la séparation : contrôleurs Nest = HTTP/validation/autorisation, services = règles, Prisma = persistance ; composants Next serveur = données/contrôle d'accès, composants `"use client"` = interactions navigateur.
5. **Sécurité serveur d'abord** : ne jamais se fier à un rôle affiché côté client, un paramètre d'URL, un `userId` envoyé par le navigateur ou un filtre React comme mesure d'autorisation. Vérifier l'accès à chaque route/action sensible et filtrer les champs renvoyés.
6. **Données financières hautement sensibles** : coûts, prix d'achat, marges, propositions sous-traitants. Aucun salarié, client ou partenaire ne doit les voir implicitement ; utiliser des projections DTO et des requêtes filtrées par organisation/projet/droit, jamais une entité Prisma brute.
7. Ne jamais rendre public un endpoint listant les utilisateurs ou des données interentreprises. L'ancien `GET /users` de Nest a été créé pour tester la DB : **vérifier qu'il a été supprimé ou protégé avant toute exposition réseau**.
8. **Secrets** : ne jamais commit les `.env`, clés Brevo/OAuth, mots de passe ou logs sensibles. Ne pas logguer les OTP ni les jetons. Fournir un `.env.example` sans secrets si nécessaire.
9. **Migrations** : inspecter le SQL avant application si une table utilisée contient des données ; jamais de `prisma migrate reset`, `db push --force-reset`, suppression de volumes Docker ou manipulation destructrice sans approbation explicite. Éviter les changements de schéma faits à la main hors migrations.
10. **Auth** : préserver le modèle `User` / `Account` / `Session` / `Verification`, les rôles plateforme `user`/`admin`, l'OTP, Google et l'account linking. Vérifier la compatibilité Better Auth/Prisma lors de tout ajout de plugin. Ne pas étendre à Apple/Microsoft/LinkedIn/Facebook pour le moment.
    - **Ne pas utiliser `requireEmailVerification: true`** dans `emailAndPassword` : Better Auth ne crée plus de session à l'inscription, ce qui oblige l'utilisateur à se re-connecter après l'OTP — comportement non standard et inacceptable. Le blocage des pages non vérifiées est géré par les Server Components (`if (!session.user.emailVerified) redirect(...)`), ce qui est suffisant pour la V0.
11. **Tests adaptés** : exécuter build/typecheck/lint/test disponibles sur la partie modifiée ; ajouter des tests de garde/permissions pour les changements de sécurité. Ne pas déclarer un test « OK » s'il n'a pas été exécuté.
12. Ne pas pousser sur GitHub, déployer ou manipuler la production sans demande explicite. Préserver les modifications préexistantes de l'utilisateur.
13. **Ne pas anticiper tout le métier maintenant** : V0 = identité, compte, administration, coque applicative. Le futur schéma chantier est documenté pour orienter les choix, pas pour demander des dizaines de tables prématurément.

## Priorités à court terme

- Terminer la page de profil : édition du nom, photo, méthodes réellement liées **mot de passe et Google seulement**, changement de mot de passe/email avec revalidation et suppression sécurisée du compte.
- Vérifier les parcours OTP, renvoi, erreurs Google `account_not_linked`, protections `/app`, `/admin`, `/profile` et sous-routes ; mettre en place des tests auth.
- Auditer le `GET /users` historique, les routes de test email et l'API Nest encore non authentifiée ; harmoniser les vérifications de session entre Next et Nest **avant** d'exposer des endpoints métier.
- Mettre en place un layout app/admin simple, cohérent et réutilisable, puis reprendre le modèle métier progressivement.

## Documentation vivante

- `docs/PROJECT_CONTEXT.md` : vision, historique Anaka, métier, architecture cible, statut V0, sécurité, décisions ouvertes et backlog.
- Pour chaque changement notable, mettre à jour la **section concernée** du contexte (notamment « État de la V0 » et « Décisions ouvertes »), sans la recopier intégralement dans ce fichier.
- Si le code contredit ce document, **signaler la divergence**, corriger la documentation après vérification plutôt que modifier arbitrairement du code qui fonctionne.
