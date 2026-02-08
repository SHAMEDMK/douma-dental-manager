# DOUMA Dental Manager

Application de gestion professionnelle pour cabinets dentaires et laboratoires, inspirée par Kerox Dental.

## Fonctionnalités Clés

- **Gestion Commerciale** : Commandes, Devis, Factures, Paiements (partiels, COD).
- **Gestion de Stock** : Suivi des mouvements, alertes stock bas, inventaire.
- **Portail Client** : Accès sécurisé pour les clients (historique, commandes).
- **Rôles Utilisateurs** : Admin, Comptable, Magasinier, Client.
- **Design Professionnel** : Interface moderne, responsive et élégante.

## Prérequis

- Node.js 18+
- npm ou yarn
- Docker (optionnel, pour PostgreSQL en production)

## Installation (Local - Windows 11)

1.  **Cloner le projet**
    ```bash
    git clone <url-du-repo>
    cd tactac
    ```

2.  **Installer les dépendances**
    ```bash
    npm install
    ```

3.  **Configurer l'environnement**
    Copiez le fichier d'exemple :
    ```bash
    cp .env.example .env
    ```
    (Ou manuellement renommez `.env.example` en `.env`)

4.  **Initialiser la base de données (SQLite par défaut)**
    ```bash
    npm run db:push
    npx prisma db seed
    ```
    *Note : Un script `npm run db:reset` est disponible pour réinitialiser la base.*

5.  **Lancer le serveur de développement**
    ```bash
    npm run dev
    ```
    Accédez à `http://localhost:3000`.

## Scripts Utiles

- `npm run dev` : Lance le serveur de développement.
- `npm run db:reset` : Réinitialise la base de données (supprime tout et relance le seed).
- `npm run db:migrate` : Crée une migration Prisma (pour les changements de schéma).
- `npm run db:studio` : Ouvre Prisma Studio pour voir la base de données.

## Comptes de Démonstration (Seed)

- **Admin** : `admin@douma.com` / `password`
- **Comptable** : `compta@douma.com` / `password`
- **Magasinier** : `stock@douma.com` / `password`
- **Client** : Créé via l'interface Admin.

## Documentation

- 📚 **[Guide Utilisateur](docs/GUIDE_UTILISATEUR.md)** : Guide complet pour les utilisateurs (clients)
- 👨‍💼 **[Guide Administrateur](docs/GUIDE_ADMIN.md)** : Guide complet pour les administrateurs
- 🧪 **[Guide Tests E2E](docs/E2E_DOUMA_GUIDE.md)** : Commandes, workflows, comptes de test, template, dépannage et CI

**Quick start E2E** : `npm run test:e2e:check` puis `npm run test:e2e`

## Déploiement Production

1.  Utiliser PostgreSQL via Docker :
    ```bash
    docker-compose up -d
    ```
2.  Mettre à jour `.env` avec l'URL PostgreSQL :
    `DATABASE_URL="postgresql://douma:password@localhost:5432/douma_dental?schema=public"`
3.  Lancer les migrations :
    ```bash
    npx prisma migrate deploy
    ```
4.  Builder et lancer :
    ```bash
    npm run build
    npm start
    ```
# douma-dental-manager
