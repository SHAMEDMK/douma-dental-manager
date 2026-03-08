# 📋 Rapport de projet — Tactac

**Plateforme e-commerce B2B pour dentistes**  
Document technique pour présentation à un développeur  
*Dernière mise à jour : Février 2026*

---

## 1. 🎯 Vue d'ensemble du projet

### Objectif principal
**Tactac** (Douma Dental Manager) est une plateforme de vente de matériel dentaire B2B avec **gestion de stock avancée**, **workflow de commande complet** (validation, préparation, livraison, facturation) et **multi-rôles** (admin, client, comptable, magasinier, livreur).

### Public cible
- **Cabinets dentaires** et **laboratoires** (segments LABO, DENTISTE, REVENDEUR)
- **Distributeurs** avec gestion des remises et du crédit client
- Équipes internes : **comptabilité**, **magasin**, **livraison**

### Points clés
| Aspect | Détail |
|--------|--------|
| **Multi-rôles** | ADMIN, CLIENT, COMPTABLE, MAGASINIER (+ sous-type LIVREUR) avec redirections et permissions par espace |
| **Workflow complet** | Commande → Approbation (si marge négative) → Préparation → Expédition → Livraison avec code de confirmation |
| **Sécurisation** | Rate limiting, cookies HttpOnly, audit logs, verrouillage des factures, backups |

---

## 2. ✅ Fonctionnalités implémentées (terminées et stables)

### 2.1 Système d'authentification & rôles
- [x] **4 rôles distincts** : ADMIN, CLIENT, COMPTABLE, MAGASINIER (userType MAGASINIER / LIVREUR pour livreurs)
- [x] **Login sécurisé** avec redirections par rôle (admin → `/admin`, client → `/portal`, etc.)
- [x] **Protection des routes** par vérification de session côté serveur (getSession) sur chaque page sensible
- [x] **Sessions** : cookies HttpOnly (jose JWT), pas de middleware Next.js central (protection par layout/pages)
- [x] **Rate limiting** sur login et sur routes API critiques (PDF, admin)
- [x] **Invitation clients** par token, **réinitialisation mot de passe** (forgot-password + reset avec token)

### 2.2 Tableau de bord & interfaces
- [x] **Dashboard admin** : statistiques (commandes, CA, alertes stock), liens rapides
- [x] **Portail client** : catalogue, panier, commandes, factures, favoris, demande de contact
- [x] **Espace comptable** : factures, paiements, commandes, exports Excel/CSV
- [x] **Espace magasinier** : commandes à préparer, stock par produit, mouvements
- [x] **Espace livreur** : tournée, confirmation de livraison avec code

### 2.3 Gestion des produits
- [x] **CRUD complet** produits (création, édition, suppression avec garde-fous)
- [x] **Catégories** et prix par segment (priceLabo, priceDentiste, priceRevendeur)
- [x] **Upload d’images** (API `/api/upload/product-image`) avec Sharp
- [x] **Favoris** par client (et par variante)
- [x] **Variantes de produits** : ProductOption (ex. Variété, Teinte, Dimension), ProductVariant avec SKU/stock/prix, génération en masse depuis les options

### 2.4 Workflow de commande complet
- [x] **Panier** avec calcul automatique (TVA, remise client, limite de crédit)
- [x] **Processus de commande** : panier → validation → commande confirmée
- [x] **Validation admin** si marge négative (paramétrable dans AdminSettings)
- [x] **Limite de crédit** par client (creditLimit, balance), blocage du panier si dépassement
- [x] **Génération automatique** des factures à la création de commande
- [x] **Livraison** : statuts PREPARED → SHIPPED → DELIVERED, bon de livraison (BL), code de confirmation, livreur assigné

### 2.5 Gestion administrative
- [x] **CRUD clients** avec code client (clientCode), invitations, suppression
- [x] **Livreurs** (delivery-agents) : CRUD, réassignation sur commande
- [x] **Paramètres entreprise** (CompanySettings) : raison sociale, adresse, ICE, TVA, conditions de paiement, **nom de banque et RIB**, logo
- [x] **Paramètres admin** (approbation, messages)
- [x] **Sauvegarde / restauration** (scripts backup, liste et téléchargement dans l’admin)
- [x] **Logs d’audit** (AuditLog) : actions sur commandes, factures, paiements, produits, connexions, etc.

### 2.6 Système financier
- [x] **Facturation** : TVA (taux configurable), remises, montant en lettres (number-to-words)
- [x] **Paiements partiels et complets** (CASH, CHECK, TRANSFER, COD)
- [x] **Verrouillage des factures** (invoice-lock) pour éviter les modifications après paiement
- [x] **Exports** Excel/CSV (invoices, orders, clients)
- [x] **PDF** : factures et bons de livraison (admin, portail, comptable) via routes API dédiées

### 2.7 Gestion de stock avancée
- [x] **Stock en temps réel** par produit et par variante, alertes (minStock)
- [x] **Mouvements de stock** tracés (IN, OUT, RESERVED, ADJUSTMENT) avec référence et createdBy
- [x] **Ajustements manuels** avec justificatif (StockAdjustmentForm)
- [x] **Niveaux de réapprovisionnement** (minStock) configurables

---

## 3. 🛠️ Architecture technique détaillée

### 3.1 Stack réelle
| Couche | Technologie |
|--------|-------------|
| **Framework** | Next.js **16** (App Router) |
| **Langage** | TypeScript |
| **UI** | React **19** |
| **Styles** | Tailwind CSS **4** |
| **ORM / BDD** | Prisma — **SQLite** en dev (fichier `dev.db`), schéma compatible PostgreSQL pour migration future |
| **Tests E2E** | Playwright |
| **Tests unitaires** | Vitest (@testing-library/react, jsdom) |
| **Emails** | Resend (optionnel) |
| **Auth** | Session JWT (jose), bcrypt pour les mots de passe |

> **Le saviez-vous ?** Le projet utilise Next.js 16 et React 19, ce qui place l’appli sur une base très récente. Prisma est configuré en SQLite pour le dev ; un simple changement de `provider` et `DATABASE_URL` permet de passer en PostgreSQL en production.

### 3.2 Backend
- **Structure** : App Router Next.js 14+, **Server Actions** pour les mutations (orders, products, stock, company-settings, auth, etc.)
- **Base de données** : Prisma ORM, migrations versionnées dans `prisma/migrations/`
- **API** : Routes API Next.js pour login/logout (auth), PDF, upload, exports, health, delivery, favorites
- **Sécurité** : Validation des entrées (Zod où pertinent), sanitization, pas de CSRF explicite (SameSite cookies)

### 3.3 Frontend
- **UI** : Composants React réutilisables (admin, portal, comptable, magasinier, delivery)
- **Styling** : Tailwind CSS, pas de shadcn/ui dans le repo (composants “maison” ou simples)
- **État** : React Server Components en priorité ; Client Components pour formulaires et interactions (CartContext, toasts)
- **Formulaires** : Formulaires contrôlés + Server Actions ; react-hot-toast pour le feedback

### 3.4 Sécurité
- **Authentification** : Cookie de session (JWT) HttpOnly, vérification via `getSession()` dans les layouts/pages
- **Autorisations** : Vérification du rôle (ADMIN, CLIENT, etc.) avant affichage ou action
- **Rate limiting** : En mémoire (lib/rate-limit.ts) sur login et routes API sensibles (admin, PDF) ; header `X-Rate-Limit-Test-Id` pour isoler les tests E2E
- **Validation** : Contrôles côté serveur dans les Server Actions ; Zod utilisé pour les schémas quand nécessaire

### 3.5 Base de données — Schéma Prisma (24 modèles)
```prisma
// Principaux modèles
User, Invitation, PasswordResetToken
Product, ProductVariant, ProductOption, ProductOptionValue, ProductVariantOptionValue, ProductPrice
StockMovement
Order, OrderItem, DeliveryNote
Invoice, Payment, GlobalSequence
AdminSettings, CompanySettings
FavoriteProduct, ClientRequest
AuditLog
```

- **Séquences globales** : `GlobalSequence` pour numéros de commande, facture, BL (ex. ORDER-2025, INVOICE-2025).
- **Traçabilité** : `AuditLog` (action, entityType, entityId, userId, details, ipAddress, userAgent).

---

## 4. 🧪 Système de tests (état actuel)

### Playwright E2E
- **Répertoire** : `tests/e2e/` — **24 fichiers** de specs
- **Configuration** : `baseURL: http://127.0.0.1:3000` pour éviter les soucis localhost / 127.0.0.1
- **Projets** : `auth-setup` (login admin/client) → `admin`, `client`, `no-auth` (auth, rate-limit, api-admin-security)
- **Seed E2E** : `E2E_SEED=1` pour un seed déterministe (mots de passe connus des tests)

### Résultats typiques
- **Nombre de tests** : plusieurs dizaines (suites admin, client, no-auth)
- **Taux de réussite** : rapports internes indiquent **100 %** sur les suites principales (27/27 exécutés dans un bilan)
- **Tests connus à surveiller** : pdf-generation (navigation BL), delivery-workflow (sélecteurs), workflow.order-to-prepared (synchronisation statut)

### Problèmes résolus récemment
- **Authentification** : utilisation de **127.0.0.1** partout (baseURL, redirects) pour cohérence avec les cookies
- **Seed E2E** : `cross-env E2E_SEED=1` et seed dédié pour mots de passe fixes
- **Rate limiting** : header **X-Rate-Limit-Test-Id** pour isoler les tests et éviter les blocages
- **Sélecteurs** : refactoring pour éviter les conflits (boutons et liens bien identifiés)

### Vitest
- **Unitaires** : `app/lib/__tests__/` (invoice-utils, pricing, sequence, tax)
- **Config** : `vitest.config.ts`, jsdom pour le DOM

---

## 5. 🚧 Fonctionnalités en cours ou prévues

### Système de variantes (en place, à enrichir)
- **Modèle** : Product → ProductOption (Variété, Teinte, Dimension) → ProductOptionValue → ProductVariant (SKU, stock, prix)
- **Exemple** : produit “Zircone” avec 6 variétés × 5 teintes × 7 dimensions = **210 variantes** possibles
- **Défis** : performance avec beaucoup de variantes, UX catalogue (filtres par option), gestion du panier (résolution variante avant validation)

### Améliorations UX/UI prévues
- Recherche avancée et filtres combinés
- Tableaux avec tri et pagination homogènes
- Notifications en temps réel
- Design mobile-first renforcé

### Évolutions business
- Devis convertibles en commandes
- Gestion des retours et SAV
- Intégration paiement en ligne
- Synchronisation avec une comptabilité externe

---

## 6. 🐛 Bugs connus et correctifs

### Critiques (à traiter avant production)
- **Navigation** : s’assurer que partout (redirects, liens, tests) on utilise la même origine (127.0.0.1 vs localhost) pour éviter les pertes de cookie
- **Timeouts** : workflows E2E longs (commande → préparation → livraison) peuvent nécessiter des timeouts ou attentes explicites
- **Cache** : certaines données (paramètres, stats) sont en cache court (ex. settings-cache 1 min) ; en cas de changement, revalidation ou délai à prendre en compte

### Mineurs
- Messages d’erreur plus explicites pour l’utilisateur final
- États de chargement sur les actions longues (exports, génération PDF)
- Optimisation des images (taille, formats)

### Correctifs déjà appliqués
- **Rate limiting** : les GET de navigation vers `/admin/*` ne sont pas limités (seuls les POST/PUT/DELETE et API le sont), évitant le blocage de la navigation (voir `RATE_LIMIT_FIX.md`).

---

## 6.1 💡 Le saviez-vous ?

- **Montant en lettres** : les factures affichent le montant TTC en toutes lettres (ex. « Deux mille cent euros ») grâce au module `number-to-words`, pour conformité et lisibilité.
- **Séquences globales** : les numéros de commande (CMD-2025-0001), facture (FAC-2025-0001) et BL (BL-YYYYMMDD-0001) sont gérés par une table `GlobalSequence` pour éviter les doublons et garder un format métier.
- **Un favori par variante** : un client peut mettre en favori le produit « Zircone » en teinte A2 et dimension 12 ; le couple (userId, productId, productVariantId) est unique en base.
- **Code de livraison** : à l’expédition, un code court est généré pour que le livreur (ou le client) confirme la livraison sans avoir besoin de se connecter avec le compte client.

---

## 6.2 🎖️ War stories (debug mémorables)

- **Cookie qui disparaît en E2E** : après login, la redirection allait vers `localhost:3000` alors que Playwright ouvrait `127.0.0.1:3000`. Même domaine nécessaire pour le cookie → tout a été aligné sur `127.0.0.1` (baseURL + redirects API auth). Plus un seul échec lié au cookie.
- **Rate limit qui tue les tests** : les tests s’exécutaient en parallèle et partageaient le même store de rate limit. Un test de login déclenchait le blocage pour les autres. Solution : header `X-Rate-Limit-Test-Id` pour isoler les compteurs en mode test.
- **Navigation admin bloquée** : en dev, après quelques actions, toute la zone `/admin` renvoyait 429. Cause : le rate limit s’appliquait aussi aux GET. Correction : limiter uniquement les mutations et les API, pas la navigation GET (voir `RATE_LIMIT_FIX.md`).

---

## 7. 📊 Métriques de qualité

### Codebase
- **Lignes de code** : ordre de grandeur **~15k–35k** (app, lib, components, prisma, tests) selon périmètre
- **Modèles Prisma** : **24**
- **Migrations** : versionnées, historique propre
- **Dépendances** : maintenues (Next 16, React 19, Prisma 5, Tailwind 4)

### Base de données
- **Tables** : 24 modèles (User, Product, Order, Invoice, StockMovement, AuditLog, etc.)
- **Seed** : script Prisma + seed E2E dédié pour environnement reproductible

### Tests
- **E2E** : bonne couverture des parcours critiques (auth, produits, stock, clients, commandes, livraison, factures, backups, audit)
- **Unitaires** : lib (facturation, séquences, TVA, pricing)

---

## 8. 🔧 Défis techniques surmontés

### Défi 1 : Authentification et navigation E2E
- **Problème** : les tests échouaient après login (cookie non envoyé, redirects vers localhost vs 127.0.0.1).
- **Solution** : baseURL Playwright en **127.0.0.1**, redirects d’auth vers la même origine ; passage par une **route API** pour le login avec redirect 303.
- **Résultat** : tests d’auth stables.

### Défi 2 : Isolation des tests (rate limiting)
- **Problème** : le rate limiting partagé entre tests faisait échouer des requêtes légitimes.
- **Solution** : header **X-Rate-Limit-Test-Id** unique par run/test pour isoler les compteurs en mode test.
- **Résultat** : tests de rate limit fiables sans interférence.

### Défi 3 : Seed reproductible pour E2E
- **Problème** : mots de passe et données différentes entre dev et tests.
- **Solution** : variable **E2E_SEED=1** et script de seed conditionnel (cross-env) pour générer toujours les mêmes utilisateurs et données.
- **Résultat** : environnement de test reproductible.

### Défi 4 : Variantes produit à grande échelle
- **Problème** : gérer 200+ combinaisons (variété × teinte × dimension) sans exploser la complexité.
- **Solution** : modèle **ProductOption / ProductOptionValue / ProductVariant** avec génération en masse des variantes et résolution au moment du panier/commande.
- **Résultat** : catalogue par variantes avec stock et prix par SKU.

### Ce dont on est le plus fier
- **Workflow bout en bout** : commande → approbation → préparation → BL → expédition → livraison avec code de confirmation.
- **Variantes scalables** : un même modèle sert pour 10 ou 210 combinaisons sans coder en dur.
- **Audit + backups** : traçabilité complète et possibilité de restaurer en cas d’erreur.
- **E2E solides** : auth-setup, projets par rôle, seed reproductible, rate limit isolé — base fiable pour la suite.

---

## 9. 🗺️ Roadmap (prochaines semaines)

| Période | Objectifs |
|---------|-----------|
| **Semaine 1** | Finaliser les 3 tests E2E restants ; ajouter des tests sur les variantes ; viser ~90 % de couverture sur les parcours critiques |
| **Semaine 2** | Affiner l’UX variantes (sélection au catalogue, panier), gestion de stock par variante côté admin |
| **Semaine 3** | Optimisations (requêtes Prisma, cache si besoin), performance avec 200+ variantes |
| **Semaine 4** | Pré-production : tests de charge, documentation utilisateur, déploiement staging |

---

## 10. 🎨 Aspects visuels et UX

- **Design** : interface sobre, orientée métier (tableaux, formulaires, états clairs).
- **Cohérence** : mêmes patterns (listes, filtres, boutons d’action) entre admin, portail, comptable, magasinier.
- **Feedback** : toasts (react-hot-toast) sur les actions, messages de succès/erreur dans les formulaires.
- **Impression** : factures et BL optimisés pour l’impression (classes print:, mise en page lisible).

---

## 11. 📈 Impact business

- **Pour les dentistes / labos** : commande rapide depuis le portail, suivi des commandes et des factures, favoris.
- **Pour l’admin** : visibilité complète (commandes, stock, clients, livreurs, paramètres entreprise, audit, backups).
- **Pour la comptabilité** : factures, paiements, exports pour la compta externe.
- **Pour le magasin / livraison** : préparation, BL, code de confirmation, traçabilité.

---

## 12. 🤝 Collaboration et gestion de projet

- **Versioning** : Git, conventions de commits.
- **Documentation** : nombreux fichiers Markdown (guides utilisateur/admin, implémentations audit/backup/emails/tests, rapports E2E).
- **Bonnes pratiques** : Server Actions pour les mutations, vérification de session et rôle, audit des actions sensibles, migrations Prisma propres.

---

## 13. 🔮 Vision à long terme

- **Application mobile** ou PWA pour les clients / livreurs.
- **API publique** pour intégrations (compta, ERP).
- **Multi-entrepôts** et internationalisation (i18n déjà préparable dans la structure).
- **Scalabilité** : schéma Prisma et découpage par rôles permettent d’envisager 10k+ produits et davantage d’utilisateurs avec une BDD adaptée (ex. PostgreSQL).

---

*Rapport généré pour présentation technique du projet Tactac (Douma Dental Manager).*
