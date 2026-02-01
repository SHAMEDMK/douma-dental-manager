# Compte Comptable - Documentation Complète

## 📋 Vue d'ensemble

Le **compte comptable** (rôle `COMPTABLE`) est un rôle utilisateur spécialisé dans la gestion financière de l'application. Il a accès aux fonctionnalités liées aux factures, paiements et exports, mais avec des restrictions par rapport à l'administrateur.

---

## 🔐 Informations de Connexion

### Compte par défaut (Seed)
- **Email** : `compta@douma.com`
- **Mot de passe** : Défini par la variable d'environnement `ADMIN_PASSWORD` (par défaut, même que l'admin)
- **Nom** : "Comptable Douma"
- **Rôle** : `COMPTABLE`

### Création du compte
Le compte est créé automatiquement lors du seed de la base de données (`prisma/seed.ts`).

---

## ✅ Fonctionnalités Accessibles

### 1. Factures (`/admin/invoices`)
- ✅ **Consultation** : Voir toutes les factures
- ✅ **Détails** : Accéder aux détails d'une facture
- ✅ **Filtres** : Filtrer par statut, client, dates
- ✅ **Export Excel** : Exporter les factures (`/api/admin/export/invoices`)
- ✅ **PDF** : Télécharger les factures en PDF
- ✅ **Impression** : Imprimer les factures

### 2. Paiements (`/admin/payments`)
- ✅ **Enregistrer un paiement** : `recordPaymentAction` (ADMIN ou COMPTABLE)
- ✅ **Modifier un paiement** : `updatePaymentAction` (ADMIN ou COMPTABLE)
- ✅ **Supprimer un paiement** : `deletePaymentAction` (ADMIN ou COMPTABLE)
- ✅ **Historique** : Voir tous les paiements enregistrés

### 3. Commandes (`/admin/orders`)
- ✅ **Consultation** : Voir toutes les commandes
- ✅ **Détails** : Accéder aux détails d'une commande
- ✅ **Filtres** : Filtrer par statut, client, segment, dates
- ✅ **PDF Bon de livraison** : Télécharger les BL en PDF
- ✅ **Impression BL** : Imprimer les bons de livraison
- ⚠️ **Actions limitées** : Peut voir mais certaines actions nécessitent ADMIN (voir restrictions)

### 4. Dashboard (`/admin/dashboard`)
- ✅ **Consultation** : Accès au tableau de bord
- ✅ **Statistiques** : Voir les statistiques générales

### 5. Exports
- ✅ **Export Factures** : `/api/admin/export/invoices` (ADMIN ou COMPTABLE)
- ✅ **Export Commandes** : Probablement accessible (à vérifier)

---

## ❌ Fonctionnalités Restreintes (ADMIN uniquement)

### 1. Gestion des Clients (`/admin/clients`)
- ❌ **Création** : Impossible de créer des clients
- ❌ **Modification** : Impossible de modifier les clients
- ❌ **Suppression** : Impossible de supprimer les clients
- ❌ **Invitations** : Impossible de créer des invitations

### 2. Gestion des Produits (`/admin/products`)
- ❌ **Création** : Impossible de créer des produits
- ❌ **Modification** : Impossible de modifier les produits
- ❌ **Suppression** : Impossible de supprimer les produits

### 3. Gestion du Stock (`/admin/stock`)
- ❌ **Ajustements** : Impossible d'ajuster le stock
- ❌ **Mouvements** : Impossible de gérer les mouvements de stock

### 4. Gestion des Livreurs (`/admin/delivery-agents`)
- ❌ **Création** : Impossible de créer des livreurs
- ❌ **Suppression** : Impossible de supprimer des livreurs

### 5. Paramètres (`/admin/settings`)
- ❌ **Paramètres Admin** : Accès refusé
- ❌ **Paramètres Company** : Accès refusé

### 6. Logs d'Audit (`/admin/audit`)
- ❌ **Consultation** : Accès refusé (ADMIN uniquement)

### 7. Backups (`/admin/backups`)
- ❌ **Gestion** : Accès refusé (ADMIN uniquement)

### 8. Actions sur les Commandes
- ❌ **Préparer commande** : Impossible (ADMIN uniquement)
- ❌ **Expédier commande** : Impossible (ADMIN uniquement)
- ❌ **Livrer commande** : Impossible (ADMIN uniquement)
- ❌ **Approuver commande** : Impossible (ADMIN uniquement)
- ❌ **Créer bon de livraison** : Impossible (ADMIN uniquement)

---

## 🔒 Permissions Détaillées

### Actions Serveur Accessibles

| Action | Fichier | Permission |
|--------|---------|------------|
| `recordPaymentAction` | `app/actions/admin-payments.ts` | ✅ ADMIN ou COMPTABLE |
| `updatePaymentAction` | `app/actions/admin-payments.ts` | ✅ ADMIN ou COMPTABLE |
| `deletePaymentAction` | `app/actions/admin-payments.ts` | ✅ ADMIN ou COMPTABLE |
| `generateInvoiceAction` | `app/actions/admin-orders.ts` | ✅ ADMIN ou COMPTABLE |

### Routes API Accessibles

| Route | Méthode | Permission |
|-------|---------|------------|
| `/api/admin/export/invoices` | GET | ✅ ADMIN ou COMPTABLE |
| `/api/pdf/admin/invoices/[id]` | GET | ✅ ADMIN, COMPTABLE ou MAGASINIER |
| `/api/pdf/admin/orders/[id]/delivery-note` | GET | ✅ ADMIN, COMPTABLE ou MAGASINIER |

### Pages Accessibles

| Page | Accès | Restrictions |
|------|-------|--------------|
| `/admin/dashboard` | ✅ | Aucune |
| `/admin/invoices` | ✅ | Consultation uniquement |
| `/admin/invoices/[id]` | ✅ | Consultation uniquement |
| `/admin/payments` | ✅ | Consultation + Actions (enregistrer/modifier/supprimer) |
| `/admin/orders` | ✅ | Consultation uniquement |
| `/admin/orders/[id]` | ✅ | Consultation uniquement |
| `/admin/clients` | ⚠️ | Probablement accessible en lecture seule (à vérifier) |
| `/admin/products` | ⚠️ | Probablement accessible en lecture seule (à vérifier) |
| `/admin/stock` | ⚠️ | Probablement accessible en lecture seule (à vérifier) |
| `/admin/settings` | ❌ | ADMIN uniquement |
| `/admin/audit` | ❌ | ADMIN uniquement |
| `/admin/backups` | ❌ | ADMIN uniquement |
| `/admin/delivery-agents` | ❌ | ADMIN uniquement |

---

## 📊 Cas d'Usage Typiques

### 1. Enregistrer un Paiement
Le comptable peut :
- Enregistrer un nouveau paiement pour une facture
- Choisir la méthode (Espèces, Chèque, Virement, COD)
- Saisir une référence (numéro de chèque, référence virement, etc.)
- Le système calcule automatiquement le solde restant et met à jour le statut de la facture

### 2. Modifier un Paiement
Le comptable peut :
- Modifier le montant d'un paiement existant
- Modifier la méthode de paiement
- Modifier la référence
- Le système recalcule automatiquement les soldes et statuts

### 3. Supprimer un Paiement
Le comptable peut :
- Supprimer un paiement enregistré par erreur
- Le système recalcule automatiquement les soldes et statuts

### 4. Exporter les Factures
Le comptable peut :
- Exporter toutes les factures en Excel
- Utiliser les filtres pour exporter des factures spécifiques
- Rate limit : 10 requêtes par minute

### 5. Consulter les Commandes
Le comptable peut :
- Voir toutes les commandes
- Filtrer par statut, client, segment, dates
- Voir les détails d'une commande
- Télécharger les bons de livraison en PDF

---

## 🔐 Sécurité et Audit

### Rate Limiting
- **Export factures** : 10 requêtes par minute
- **PDF** : 20 requêtes par minute
- **Autres routes** : 100 requêtes par minute (défaut)

### Audit Logs
Les actions du comptable sont loggées :
- ✅ `PAYMENT_RECORDED` - Lors de l'enregistrement d'un paiement
- ✅ `PAYMENT_UPDATED` - Lors de la modification d'un paiement
- ✅ `PAYMENT_DELETED` - Lors de la suppression d'un paiement
- ✅ `INVOICE_CREATED` - Lors de la génération d'une facture (si autorisé)

### Accès Non Autorisés
Les tentatives d'accès non autorisées sont loggées :
- ❌ Tentative d'accès à `/admin/settings` → `UNAUTHORIZED_ACCESS`
- ❌ Tentative d'accès à `/admin/audit` → `UNAUTHORIZED_ACCESS`
- ❌ Tentative d'accès à `/admin/backups` → `UNAUTHORIZED_ACCESS`

---

## 📝 Notes Importantes

### 1. Restrictions sur les Factures
- Le comptable peut **consulter** toutes les factures
- Le comptable peut **enregistrer/modifier/supprimer** des paiements
- Le comptable peut **générer des factures** (si l'action le permet)
- ⚠️ Certaines modifications de factures peuvent être restreintes (vérifier `isInvoiceLocked`)

### 2. Restrictions sur les Commandes
- Le comptable peut **consulter** toutes les commandes
- Le comptable peut **voir les détails** d'une commande
- Le comptable peut **télécharger les BL** en PDF
- ❌ Le comptable **ne peut pas** modifier le statut des commandes
- ❌ Le comptable **ne peut pas** préparer/expédier/livrer des commandes

### 3. Interface Utilisateur
- Le comptable utilise la **même interface admin** (`/admin/*`)
- La sidebar affiche tous les menus, mais certaines pages redirigent vers `/login` si l'accès est refusé
- Les boutons d'action peuvent être masqués ou désactivés selon les permissions

---

## 🎯 Résumé des Permissions

### ✅ Peut faire
- Consulter factures, paiements, commandes
- Enregistrer/modifier/supprimer des paiements
- Exporter les factures en Excel
- Télécharger les factures et BL en PDF
- Voir le dashboard et les statistiques

### ❌ Ne peut pas faire
- Gérer les clients (créer/modifier/supprimer)
- Gérer les produits (créer/modifier/supprimer)
- Gérer le stock (ajustements)
- Gérer les livreurs
- Modifier les paramètres
- Voir les logs d'audit
- Gérer les backups
- Modifier le statut des commandes (préparer/expédier/livrer)

---

## 🔄 Différences avec ADMIN

| Fonctionnalité | ADMIN | COMPTABLE |
|----------------|-------|-----------|
| Factures | ✅ Tous droits | ✅ Consultation + Paiements |
| Paiements | ✅ Tous droits | ✅ Tous droits |
| Commandes | ✅ Tous droits | ✅ Consultation uniquement |
| Clients | ✅ Tous droits | ❌ Accès refusé |
| Produits | ✅ Tous droits | ❌ Accès refusé |
| Stock | ✅ Tous droits | ❌ Accès refusé |
| Livreurs | ✅ Tous droits | ❌ Accès refusé |
| Paramètres | ✅ Tous droits | ❌ Accès refusé |
| Audit | ✅ Tous droits | ❌ Accès refusé |
| Backups | ✅ Tous droits | ❌ Accès refusé |

---

## 📚 Références Techniques

### Fichiers Clés
- **Schéma** : `prisma/schema.prisma` (ligne 17 - rôle COMPTABLE)
- **Seed** : `prisma/seed.ts` (ligne 50 - création compte comptable)
- **Actions paiements** : `app/actions/admin-payments.ts`
- **Actions commandes** : `app/actions/admin-orders.ts`
- **Export factures** : `app/api/admin/export/invoices/route.ts`
- **PDF factures** : `app/api/pdf/admin/invoices/[id]/route.ts`

### Vérifications de Permissions
Les vérifications sont faites avec :
```typescript
if (!session || (session.role !== 'ADMIN' && session.role !== 'COMPTABLE')) {
  return { error: 'Non autorisé' }
}
```

---

## ✅ Conclusion

Le compte comptable est un **rôle spécialisé** pour la gestion financière :
- **Accès complet** aux factures et paiements
- **Consultation** des commandes
- **Restrictions** sur la gestion des données (clients, produits, stock)
- **Sécurité** : Rate limiting et audit logs activés

C'est le rôle idéal pour un comptable qui doit gérer les paiements et consulter les factures sans avoir accès à la configuration générale de l'application.
