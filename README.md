# Batilib

## Lancer l'application (environnement de test)

Les trois composants doivent être démarrés dans l'ordre suivant : base de données, backend, frontend.

### 1. Base de données (racine du projet)

```bash
docker compose up -d
```

Lance un conteneur PostgreSQL sur le port `5433`.

### 2. Backend (`~/backend`)

```bash
cd backend
pnpm start:dev
```

Lance le serveur NestJS.

### 3. Visualiser la base de données (`~/backend`)

```bash
cd backend
pnpm prisma studio
```

Ouvre Prisma Studio dans le navigateur pour explorer et modifier les données.

### 4. Frontend (`~/frontend`)

```bash
cd frontend
pnpm dev
```

Lance l'application Next.js.
