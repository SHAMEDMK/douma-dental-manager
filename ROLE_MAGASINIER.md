# Rôle MAGASINIER - Permissions et Fonctionnalités

## Vue d'ensemble

Le **MAGASINIER** (aussi appelé "Livreur" ou "Delivery Agent") est un rôle opérationnel qui gère les commandes depuis leur préparation jusqu'à leur livraison. C'est un rôle intermédiaire entre l'ADMIN et le CLIENT.

## Accès et Redirection

- **Page de connexion** : Après login, redirigé vers `/delivery` (Espace Livreur)
- **Accès au dashboard admin** : ✅ Oui (lecture seule pour certaines sections)
- **Interface dédiée** : `/delivery` - Espace Livreur

## Permissions Détaillées

### 1. Gestion des Commandes

#### ✅ Actions autorisées
- **Changer le statut des commandes** :
  - `CONFIRMED` → `PREPARED` (Préparer)
  - `PREPARED` → `SHIPPED` (Expédier)
  - `SHIPPED` → `DELIVERED` (Livrer)
  - Annuler une commande (`CANCELLED`)

#### ❌ Actions interdites
- Créer des commandes
- Modifier les quantités
- Modifier les prix
- Accéder aux paramètres système
- Gérer les clients
- Gérer les utilisateurs

### 2. Espace Livreur (`/delivery`)

#### Fonctionnalités
- **Voir les commandes assignées** : Liste des commandes avec statut `SHIPPED` qui lui sont assignées
- **Informations affichées** :
  - Numéro de commande
  - Informations client (nom, entreprise, email, téléphone)
  - Adresse de livraison
  - Date d'expédition
  - Code de confirmation (si configuré)

#### Confirmation de livraison
- **Confirmer une livraison** : Utilise un code de confirmation fourni par le client
- Le code est affiché sur le bon de livraison que le client a reçu
- Une fois confirmé, la commande passe au statut `DELIVERED`

### 3. Accès aux Routes API

#### ✅ Routes autorisées
- `/api/admin/stats/alerts` - Voir les alertes (stock bas, commandes en attente)
- `/api/admin/export/orders` - Exporter les commandes en Excel
- `/api/pdf/admin/invoices/[id]` - Générer PDF de factures
- `/api/pdf/admin/orders/[id]/delivery-note` - Générer PDF de bons de livraison

#### ❌ Routes interdites
- `/api/admin/export/clients` - ADMIN uniquement
- `/api/admin/export/invoices` - ADMIN et COMPTABLE uniquement
- `/api/admin/backup` - ADMIN uniquement

### 4. Dashboard Admin

#### Accès
- ✅ Peut accéder au dashboard admin (`/admin/dashboard`)
- ✅ Peut voir les statistiques générales
- ✅ Peut voir les alertes (stock bas, commandes en attente)

#### Restrictions
- ❌ Ne peut pas gérer les clients
- ❌ Ne peut pas gérer les utilisateurs
- ❌ Ne peut pas modifier les paramètres système
- ❌ Ne peut pas créer des comptes

### 5. Gestion du Stock

#### Permissions
- ✅ Peut voir le stock (via dashboard)
- ✅ Peut voir les alertes de stock bas
- ❌ Ne peut généralement pas modifier le stock directement (réservé à l'ADMIN)

### 6. Génération de Documents

#### PDF autorisés
- ✅ Bons de livraison (`/api/pdf/admin/orders/[id]/delivery-note`)
- ✅ Factures (`/api/pdf/admin/invoices/[id]`)

## Workflow Typique

1. **Admin expédie une commande** :
   - L'admin change le statut à `SHIPPED`
   - L'admin assigne la commande au magasinier (via `deliveryAgentName`)

2. **Magasinier voit la commande** :
   - La commande apparaît dans `/delivery`
   - Notification en temps réel si nouvelle commande

3. **Magasinier livre la commande** :
   - Récupère le code de confirmation du client
   - Confirme la livraison via le formulaire
   - La commande passe au statut `DELIVERED`

## Différences avec les autres rôles

| Fonctionnalité | ADMIN | COMPTABLE | MAGASINIER | CLIENT |
|----------------|-------|-----------|------------|--------|
| Gérer les commandes | ✅ | ❌ | ✅ (statuts) | ✅ (créer) |
| Expédier commandes | ✅ | ❌ | ✅ | ❌ |
| Confirmer livraisons | ✅ | ❌ | ✅ | ❌ |
| Voir factures | ✅ | ✅ | ✅ | ✅ (ses propres) |
| Enregistrer paiements | ✅ | ✅ | ❌ | ❌ |
| Gérer clients | ✅ | ❌ | ❌ | ❌ |
| Gérer stock | ✅ | ❌ | ❌ (lecture) | ❌ |
| Exporter données | ✅ | ✅ (factures) | ✅ (commandes) | ❌ |

## Compte par défaut

- **Email** : `stock@douma.com`
- **Mot de passe** : `password` (ou valeur de `ADMIN_PASSWORD` si définie)
- **Créé automatiquement** : Oui, via le seed Prisma

## Sécurité

- ✅ Toutes les actions sont loggées dans l'audit
- ✅ Rate limiting appliqué (60 req/min pour routes admin)
- ✅ Vérification de rôle sur toutes les routes sensibles
- ✅ Accès restreint aux fonctionnalités administratives

## Notes importantes

1. **Assignation des commandes** : Seul l'ADMIN peut assigner une commande à un magasinier lors de l'expédition
2. **Code de confirmation** : Optionnel, configuré par l'ADMIN lors de l'expédition
3. **Notifications** : Le magasinier reçoit des notifications en temps réel pour les nouvelles commandes assignées
4. **Interface mobile-friendly** : L'espace livreur est optimisé pour une utilisation sur mobile/tablette
