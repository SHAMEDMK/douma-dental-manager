# Plan Phase B — UI Fournisseurs

**Date :** 2025-03-06  
**Contexte :** Phase A terminée (backend + tests validés). Passage à l’interface admin fournisseurs.  
**Objectif :** Implémenter les écrans `/admin/suppliers`, `/admin/suppliers/new`, `/admin/suppliers/[id]` en réutilisant les patterns existants.

---

## 1. Arborescence des fichiers

```
app/admin/suppliers/
├── page.tsx                 # Liste des fournisseurs (équivalent clients/page.tsx)
├── SupplierFilters.tsx       # Composant client : filtres (recherche)
├── new/
│   └── page.tsx             # Création fournisseur
└── [id]/
    ├── page.tsx             # Détail / modification fournisseur
    └── EditSupplierForm.tsx # Formulaire d’édition (client)
```

**Fichiers à modifier (pas à créer) :**
- `components/admin/Sidebar.tsx` — ajouter l’entrée « Fournisseurs » et inclure `/admin/suppliers` dans `COMMERCIAL_HREF_PREFIXES`

---

## 2. Composants React à créer

| Composant | Fichier | Rôle | Référence |
|-----------|---------|------|-----------|
| **SupplierFilters** | `app/admin/suppliers/SupplierFilters.tsx` | Filtres : recherche texte (nom, contact, email, ICE). Boutons « Appliquer » et « Réinitialiser ». Query param `q`. | ClientFilters.tsx (version allégée : pas de segment, pas de dates) |
| **CreateSupplierForm** | Intégré dans `app/admin/suppliers/new/page.tsx` | Formulaire création : name*, contact, email, phone, address, city, ice, notes. « Enregistrer » + « Annuler ». | InviteClientForm.tsx (structure form + gestion loading/error) |
| **EditSupplierForm** | `app/admin/suppliers/[id]/EditSupplierForm.tsx` | Formulaire édition (champs préremplis). « Enregistrer » + feedback succès/erreur. | EditClientForm.tsx |

**Composants à réutiliser tels quels :**
- `AdminPagination` — liste fournisseurs
- Layout admin (`app/admin/layout.tsx`) — déjà appliqué via structure `app/admin/`

---

## 3. Server actions à utiliser

| Action | Fichier | Usage |
|--------|---------|-------|
| **createSupplierAction** | `app/actions/purchases.ts` | `app/admin/suppliers/new/page.tsx` (via CreateSupplierForm ou handler inline) |
| **updateSupplierAction** | `app/actions/purchases.ts` | `app/admin/suppliers/[id]/EditSupplierForm.tsx` |

**Pas d’action dédiée pour la liste** : la page `suppliers/page.tsx` charge les données directement via `prisma.supplier.findMany` (pattern identique à `clients/page.tsx`).

---

## 4. Champs et formulaires

### 4.1 Modèle Supplier (Prisma)

| Champ | Type | Obligatoire | Usage UI |
|-------|------|-------------|----------|
| id | String | — | Clé, liens |
| name | String | Oui | input text, required |
| contact | String? | Non | input text |
| email | String? | Non | input email |
| phone | String? | Non | input tel |
| address | String? | Non | input text |
| city | String? | Non | input text |
| ice | String? | Non | input text |
| notes | String? | Non | textarea |
| createdAt | DateTime | — | Lecture seule (affichage détail) |
| updatedAt | DateTime | — | Lecture seule (optionnel) |

### 4.2 CreateSupplierForm — Champs

| Champ | Type input | Requis | Placeholder / aide |
|-------|------------|--------|---------------------|
| name | text | Oui | Ex. « Dentales Pro SARL » |
| contact | text | Non | Ex. « Jean Dupont » |
| email | email | Non | Ex. « contact@dentales.ma » |
| phone | tel | Non | Ex. « 0522 12 34 56 » |
| address | text | Non | Ex. « 12 rue Mohammed V » |
| city | text | Non | Ex. « Casablanca » |
| ice | text | Non | Ex. « 001234567000089 » |
| notes | textarea | Non | Notes internes |

### 4.3 EditSupplierForm — Champs

Mêmes champs que CreateSupplierForm, préremplis avec les données du fournisseur chargé. `name` reste obligatoire.

---

## 5. Permissions

| Route | ADMIN | COMMERCIAL | MAGASINIER | COMPTABLE |
|-------|-------|------------|------------|-----------|
| /admin/suppliers | ✅ | ✅ | ❌ | ❌ |
| /admin/suppliers/new | ✅ | ✅ | ❌ | ❌ |
| /admin/suppliers/[id] | ✅ | ✅ | ❌ | ❌ |

**Implémentation :** Vérification `getSession()` en page serveur. Si `!session || (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL')` → `redirect('/admin')`. Aligné avec `createSupplierAction` et `updateSupplierAction` qui utilisent `PURCHASE_ROLES.create = ['ADMIN','COMMERCIAL']`.

**Sidebar :**  
- Ajouter une entrée « Fournisseurs » avec `href: '/admin/suppliers'` et icône `Package` ou `Truck` (ou `Building2` si disponible).  
- Ajouter `/admin/suppliers` à `COMMERCIAL_HREF_PREFIXES` pour que le menu soit visible aux commerciaux.

---

## 6. Détail par écran

### 6.1 /admin/suppliers — Liste

| Élément | Spécification |
|---------|----------------|
| Titre | « Gestion des Fournisseurs » (ADMIN) ou « Fournisseurs » (COMMERCIAL) |
| Bouton | « Nouveau fournisseur » → `/admin/suppliers/new` (icône UserPlus ou équivalent) |
| Filtres | SupplierFilters (recherche `q` sur name, contact, email, ice) |
| Tableau | Colonnes : Nom, Contact, Email, Téléphone, Ville, ICE, Nb commandes, Actions |
| Actions | Lien « Voir » ou « Modifier » → `/admin/suppliers/[id]` |
| Pagination | AdminPagination, 20 par page, `itemLabel: { singular: 'fournisseur', plural: 'fournisseurs' }` |
| Requête Prisma | `prisma.supplier.findMany` avec `where` (recherche OR sur name, contact, email, ice), `skip`/`take`, `orderBy: [{ name: 'asc' }]`, `_count: { select: { purchaseOrders: true } }` |

### 6.2 /admin/suppliers/new — Création

| Élément | Spécification |
|---------|----------------|
| Titre | « Nouveau fournisseur » |
| Lien retour | « Retour à la liste » → `/admin/suppliers` |
| Formulaire | CreateSupplierForm (champs §4.2) |
| Boutons | « Enregistrer » (submit), « Annuler » (Link vers /admin/suppliers) |
| Succès | `createSupplierAction` retourne `supplierId` → `redirect(/admin/suppliers/${supplierId})` |
| Erreur | Afficher `result.error` sous le formulaire |

### 6.3 /admin/suppliers/[id] — Détail / modification

| Élément | Spécification |
|---------|----------------|
| Titre | « Modifier le fournisseur » ou « Fiche fournisseur » |
| Lien retour | « Retour à la liste des fournisseurs » → `/admin/suppliers` |
| Bloc 1 | Fiche lecture : name, contact, email, phone, address, city, ice, notes, createdAt, _count.purchaseOrders |
| Bloc 2 | EditSupplierForm (formulaire édition) |
| Bloc 3 (optionnel Phase B) | Liste des commandes fournisseur : tableau (N° PO, Date, Statut, Montant) avec lien → `/admin/purchases/[id]`. Phase C si route pas encore créée. |
| Succès | `updateSupplierAction` → `router.refresh()` ou message succès |
| 404 | Si `prisma.supplier.findUnique` retourne null → `notFound()` |

---

## 7. Patterns à réutiliser

| Pattern | Source | Usage Phase B |
|---------|--------|---------------|
| Pagination | `parsePaginationParams`, `computeSkipTake`, `computeTotalPages` (lib/pagination.ts), `AdminPagination` | Liste fournisseurs |
| Filtres par query params | ClientFilters | SupplierFilters (recherche `q` uniquement) |
| Redirection auth | `getSession` + `redirect('/admin')` | Toutes pages suppliers |
| Layout admin | `app/admin/layout.tsx` | Hérité automatiquement |
| Formulaire avec loading/error | InviteClientForm, EditClientForm | CreateSupplierForm, EditSupplierForm |
| Tableau responsive | clients/page.tsx | Structure `<table>`, `overflow-x-auto` |
| Lien retour | InviteClientForm, clients/[id] | new/page.tsx, [id]/page.tsx |

---

## 8. Ordre exact de développement

### Étape 1 — Menu + structure de base

1. **Sidebar**  
   - Ajouter `{ name: 'Fournisseurs', href: '/admin/suppliers', icon: Building2 }` (ou Package) dans `adminNavigationFull`.  
   - Ajouter `'/admin/suppliers'` à `COMMERCIAL_HREF_PREFIXES`.  
   - Position suggérée : après « Produits » ou avant « Commandes ».

2. **Page liste minimale**  
   - Créer `app/admin/suppliers/page.tsx`.  
   - `getSession` + redirect si non ADMIN/COMMERCIAL.  
   - `prisma.supplier.findMany` sans filtres, avec pagination (20/page).  
   - Tableau : Nom, Contact, Email, Ville, Nb commandes, lien « Voir » → `/admin/suppliers/[id]`.  
   - AdminPagination.  
   - Lien « Nouveau fournisseur » → `/admin/suppliers/new`.

3. **Page new placeholder**  
   - Créer `app/admin/suppliers/new/page.tsx`.  
   - Lien retour + titre « Nouveau fournisseur ».  
   - Structure vide prête pour le formulaire.

4. **Page [id] placeholder**  
   - Créer `app/admin/suppliers/[id]/page.tsx`.  
   - `prisma.supplier.findUnique` (avec `_count.purchaseOrders`).  
   - `notFound()` si absent.  
   - Lien retour + affichage lecture seule des champs.  
   - Pas encore d’EditSupplierForm.

### Étape 2 — Filtres + formulaires

5. **SupplierFilters**  
   - Créer `app/admin/suppliers/SupplierFilters.tsx`.  
   - Input recherche `q`, boutons Appliquer/Réinitialiser.  
   - Intégrer dans `page.tsx` et adapter le `where` Prisma : `OR: [{ name: { contains: q } }, { contact: { contains: q } }, { email: { contains: q } }, { ice: { contains: q } }]` (mode `mode: 'insensitive'` si PostgreSQL).

6. **CreateSupplierForm + new**  
   - Implémenter le formulaire dans `new/page.tsx` (ou composant dédié).  
   - Appel `createSupplierAction`.  
   - En cas de succès : `redirect(/admin/suppliers/${supplierId})`.  
   - Gestion erreur + loading.

7. **EditSupplierForm**  
   - Créer `app/admin/suppliers/[id]/EditSupplierForm.tsx`.  
   - Champs préremplis, appel `updateSupplierAction(supplierId, data)`.  
   - Intégrer dans `[id]/page.tsx` à côté de la fiche lecture.

### Étape 3 — Finitions

8. **Cohérence visuelle**  
   - Vérifier alignement titres, espacements, classes avec `clients/`.  
   - Responsive table, boutons, messages d’erreur.

9. **Liste commandes sur [id]**  
   - Si `/admin/purchases/[id]` existe (Phase C) : sous-tableau des `purchaseOrders` du fournisseur avec lien.  
   - Sinon : afficher uniquement le nombre de commandes pour l’instant.

10. **Vérification finale**  
    - Parcours : liste → new → créer → redirect [id] → modifier → refresh.  
    - Filtres, pagination.  
    - Compte COMMERCIAL : accès à toutes les routes suppliers.

---

## 9. Résumé exécutif

```
Étape 1 : Sidebar → page liste → new (placeholder) → [id] (placeholder)
Étape 2 : SupplierFilters → CreateSupplierForm (new) → EditSupplierForm ([id])
Étape 3 : Finitions + optionnel liste PO sur [id]
```

**Durée estimée :** 2–3 h pour un développeur ayant déjà travaillé sur l’admin clients.
