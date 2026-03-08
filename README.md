# DOUMA Dental Manager

Application de gestion professionnelle pour cabinets dentaires et laboratoires, inspirée par Kerox Dental.

## Fonctionnalités Clés

- **Gestion Commerciale** : Commandes, Devis, Factures, Paiements (partiels, COD).
- **Gestion de Stock** : Suivi des mouvements, alertes stock bas, inventaire.
- **Portail Client** : Accès sécurisé pour les clients (catalogue, commandes, favoris).
- **Espace Livreur** : Gestion des livraisons, confirmation avec code.
- **Rôles Utilisateurs** : Admin, Comptable, Magasinier, Commercial, Livreur, Client.
- **Design Professionnel** : Interface moderne, responsive et élégante.

## Prérequis

- Node.js 18+
- npm
- Docker (pour PostgreSQL)

## Installation

1.  **Cloner le projet**
    ```bash
    git clone <url-du-repo>
    cd douma-dental-manager
    ```

2.  **Installer les dépendances**
    ```bash
    npm install
    ```

3.  **Configurer l'environnement**
    ```bash
    cp .env.example .env
    ```
    Modifier `.env` avec votre configuration. Variables requises :
    ```
    DATABASE_URL="postgresql://douma:password@localhost:5432/douma_dental?schema=public"
    DIRECT_URL="postgresql://douma:password@localhost:5432/douma_dental?schema=public"
    JWT_SECRET="<générer avec: openssl rand -base64 32>"
    ```

4.  **Démarrer PostgreSQL**
    ```bash
    docker compose up -d
    ```

5.  **Initialiser la base de données**
    ```bash
    npm run db:push
    npm run db:seed
    ```
    *Note : `npm run db:reset` réinitialise entièrement la base.*

6.  **Lancer le serveur de développement**
    ```bash
    npm run dev
    ```
    Accédez à `http://localhost:3000`.

## Scripts Utiles

- `npm run dev` : Lance le serveur de développement (port 3000).
- `npm run lint` : Vérifie le code avec ESLint.
- `npm run test:run` : Lance les tests unitaires (Vitest).
- `npm run test:e2e` : Lance les tests E2E (Playwright).
- `npm run db:push` : Synchronise le schéma Prisma avec la base.
- `npm run db:seed` : Injecte les données de démonstration.
- `npm run db:reset` : Réinitialise la base de données.
- `npm run db:studio` : Ouvre Prisma Studio.

## Comptes de Démonstration (Seed)

| Rôle | Email | Mot de passe | URL |
|---|---|---|---|
| Admin | `admin@douma.com` | `password` | `/admin` |
| Comptable | `compta@douma.com` | `password` | `/comptable` |
| Magasinier | `stock@douma.com` | `password` | `/magasinier` |
| Commercial | `commercial@douma.com` | `password` | `/admin` |
| Livreur | `livreur@douma.com` | `password` | `/delivery` |
| Client | `client@dental.com` | `password` | `/portal` |

## Documentation

- 📚 **[Guide Utilisateur](docs/GUIDE_UTILISATEUR.md)** : Guide complet pour les utilisateurs (clients)
- 👨‍💼 **[Guide Administrateur](docs/GUIDE_ADMIN.md)** : Guide complet pour les administrateurs
- 🧪 **[Guide Tests E2E](docs/E2E_DOUMA_GUIDE.md)** : Commandes, workflows, comptes de test, dépannage et CI
- 📁 **[Notes d'implémentation](docs/archives/)** : Rapports et notes techniques archivés

**Quick start E2E** : `npm run test:e2e:check` puis `npm run test:e2e`

## Déploiement Production

1.  Démarrer PostgreSQL via Docker :
    ```bash
    docker compose up -d
    ```
2.  Configurer `.env` avec l'URL PostgreSQL et un `JWT_SECRET` fort.
3.  Lancer les migrations :
    ```bash
    npx prisma migrate deploy
    ```
4.  Builder et lancer :
    ```bash
    npm run build
    npm start
    ```
