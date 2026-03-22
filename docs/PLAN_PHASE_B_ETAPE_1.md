# Plan Phase B — Étape 1 uniquement

**Date :** 2025-03-06  
**Objectif :** Mise en place de la structure de base (menu, liste paginée, placeholders) avant les formulaires et filtres.  
**Ajustements validés :** SupplierFormFields partagé (étape 2), permissions ADMIN/COMMERCIAL à affiner, page [id] = fiche détail + bouton Modifier + historique commandes.

---

## Périmètre étape 1

- Sidebar
- `/admin/suppliers` — liste paginée
- `/admin/suppliers/new` — placeholder
- `/admin/suppliers/[id]` — placeholder fiche détail

**Hors scope :** SupplierFilters, SupplierFormFields, formulaires (création, édition), édition inline.

---

## 1. Sidebar

| Élément | Action |
|---------|--------|
| Fichier | `components/admin/Sidebar.tsx` |
| Icône | `Building2` (à ajouter aux imports depuis lucide-react) |
| Entrée | `{ name: 'Fournisseurs', href: '/admin/suppliers', icon: Building2 }` |
| Position | Après « Produits », avant « Commandes » |
| COMMERCIAL | Ajouter `'/admin/suppliers'` dans `COMMERCIAL_HREF_PREFIXES` |

**Détail import :** Dans le bloc `import { ... } from 'lucide-react'`, ajouter `Building2`.

---

## 2. Page liste `/admin/suppliers`

| Élément | Spécification |
|--------|----------------|
| Fichier | `app/admin/suppliers/page.tsx` |
| Type | Server Component |

### 2.1 Permissions

```ts
const session = await getSession()
if (!session || (session.role !== 'ADMIN' && session.role !== 'COMMERCIAL')) {
  redirect('/admin')
}
const isCommercial = session.role === 'COMMERCIAL'
```

- ADMIN : accès liste + bouton nouveau + liens détail
- COMMERCIAL : idem (lecture + création autorisées à ce stade)

### 2.2 Données

- `parsePaginationParams(params)` → page, pageSize (défaut 20)
- `computeSkipTake`, `computeTotalPages`
- `prisma.supplier.findMany({ skip, take, orderBy: [{ name: 'asc' }], select: { id, name, contact, email, phone, city, ice, _count: { select: { purchaseOrders: true } } } })`
- `prisma.supplier.count()`

**Pas de filtre** en étape 1 (SupplierFilters en étape 2).

### 2.3 UI

| Bloc | Détail |
|------|--------|
| Titre | « Gestion des Fournisseurs » (ADMIN) / « Fournisseurs » (COMMERCIAL) |
| Bouton | « Nouveau fournisseur » → `/admin/suppliers/new` — icône UserPlus, style bouton bleu (aligné clients) |
| Tableau | Colonnes : Nom, Contact, Email, Téléphone, Ville, ICE, Nb commandes, Actions |
| Actions | Lien « Voir » → `/admin/suppliers/[id]` |
| Pagination | `AdminPagination` avec `totalPages`, `totalCount`, `itemLabel: { singular: 'fournisseur', plural: 'fournisseurs' }` |

**Composants à importer :** `Link`, `UserPlus`, `AdminPagination`, `parsePaginationParams`, `computeSkipTake`, `computeTotalPages`, `prisma`, `getSession`, `redirect`.

**Référence :** Structure et styles de `app/admin/clients/page.tsx` (sans ClientFilters, sans ExportExcel).

---

## 3. Placeholder `/admin/suppliers/new`

| Élément | Spécification |
|--------|----------------|
| Fichier | `app/admin/suppliers/new/page.tsx` |
| Permissions | Identiques à la liste (ADMIN ou COMMERCIAL) |
| Contenu | Lien « Retour à la liste » → `/admin/suppliers` ; titre « Nouveau fournisseur » ; texte « Formulaire à venir (étape 2) » ou bloc vide prêt à recevoir le formulaire |

**Référence :** Layout minimal de `app/admin/clients/invite/page.tsx` (avec getSession + redirect).

---

## 4. Placeholder `/admin/suppliers/[id]`

| Élément | Spécification |
|--------|----------------|
| Fichier | `app/admin/suppliers/[id]/page.tsx` |
| Permissions | ADMIN ou COMMERCIAL |

### 4.1 Chargement

- `prisma.supplier.findUnique({ where: { id }, include: { _count: { select: { purchaseOrders: true } } } })`
- Si non trouvé → `notFound()`

### 4.2 Structure de la page (ordre d’affichage)

1. **Lien retour** — « Retour à la liste des fournisseurs » → `/admin/suppliers`

2. **Bloc Fiche fournisseur** — lecture seule  
   Champs : name, contact, email, phone, address, city, ice, notes, createdAt, _count.purchaseOrders.

3. **Bouton Modifier** — visible, mais sans action en étape 1 (lien vers `#` ou désactivé avec `title="À implémenter"`). Prévu pour étape 2.

4. **Section Historique commandes**  
   - Titre : « Commandes fournisseur »
   - Contenu : texte « X commande(s) » ou tableau vide avec en-têtes (N° PO, Date, Statut) + message « Liste des commandes à venir (Phase C) ».

**Référence :** Structure de `app/admin/clients/[id]/page.tsx` (bloc lecture seule, sans formulaire d’édition).

---

## 5. Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `components/admin/Sidebar.tsx` | Modifier (entrée + COMMERCIAL) |
| `app/admin/suppliers/page.tsx` | Créer |
| `app/admin/suppliers/new/page.tsx` | Créer (placeholder) |
| `app/admin/suppliers/[id]/page.tsx` | Créer (placeholder fiche détail) |

---

## 6. Ordre d’implémentation recommandé

1. **Sidebar** — entrée Fournisseurs + COMMERCIAL
2. **page.tsx** — liste paginée
3. **new/page.tsx** — placeholder
4. **[id]/page.tsx** — placeholder fiche détail + section commandes

---

## 7. Vérifications de fin d’étape

- [ ] Menu « Fournisseurs » visible (ADMIN et COMMERCIAL)
- [ ] Liste fournisseurs s’affiche avec pagination (20/page)
- [ ] Clic « Nouveau fournisseur » → placeholder /new
- [ ] Clic « Voir » sur un fournisseur → fiche détail avec champs et section commandes
- [ ] Fournisseur inexistant → 404
