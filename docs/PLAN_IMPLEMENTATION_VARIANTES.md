# Plan d'implémentation détaillé – Variantes de produits

Ce document détaille les modifications à apporter au code pour prendre en charge les variantes de produits, sans casser le comportement actuel (produits sans variante). Il complète `docs/CONCEPTION_VARIANTES_PRODUITS.md`.

---

## 1. Lib / utilitaires

| Fichier | Modification |
|---------|---------------|
| **`app/lib/pricing.ts`** | Étendre `ProductWithPrices` pour accepter un objet de type Product **ou** ProductVariant (champs priceLabo, priceDentiste, priceRevendeur). Ajouter `getPriceForSegmentFromVariant(variant, segment)` ou adapter `getPriceForSegment` pour accepter `product \| variant`. Pour les variantes, utiliser directement les champs priceLabo / priceDentiste / priceRevendeur. |
| **`app/lib/variant-utils.ts`** (nouveau, optionnel) | Helpers : `hasVariants(product)`, `getSellableUnits(product)` (retourne soit `[{ type: 'product', product }]` soit `[{ type: 'variant', variant }]`), `getStockForUnit(product, variantId?)`, `getPriceForUnit(product, variant?, segment)`. Centralise la logique "produit simple vs variante". |

---

## 2. Vérification SKU global

L'unicité SKU doit être globale (Product + ProductVariant). À utiliser partout où on crée ou met à jour un Product ou un ProductVariant.

| Fichier | Modification |
|---------|---------------|
| **`app/actions/product.ts`** | Avant `createProduct` / `updateProduct` : vérifier que le SKU n'existe ni dans `Product` ni dans `ProductVariant` (requête `findFirst` sur Product OU ProductVariant avec ce sku). Idem pour toute action qui crée/met à jour une variante : vérifier l'absence du SKU sur Product et sur les autres ProductVariant. |
| **Nouvelle action** (ex. dans `product.ts`) | `createVariantAction(productId, { sku, name, stock, minStock, priceLabo, priceDentiste, priceRevendeur, cost })` : vérifier SKU global, créer ProductVariant, audit. |
| **Nouvelle action** | `updateVariantAction(variantId, ...)`, `deleteVariantAction(variantId)` (refuser si variante utilisée dans des OrderItem). |

---

## 3. Actions produits (`app/actions/product.ts`)

| Fonction / zone | Modification |
|-----------------|---------------|
| **createProductAction** | Option "produit avec variantes" : si on choisit de ne pas gérer les variantes dans le formulaire initial, ne rien changer. Sinon : possibilité de créer le produit puis rediriger vers une page "ajouter des variantes", ou créer 0 variante par défaut (comportement actuel). Conserver la vérification SKU global (Product + ProductVariant). |
| **updateProductAction** | Ne pas modifier les variantes ici (formulaire produit parent). Vérification SKU global si `product.sku` change (et que ce SKU n'est pas utilisé par une variante). |
| **deleteProductAction** | Vérifier aussi les `orderItems` liés aux **variantes** du produit (`product.variants` → orderItems). Bloquer la suppression si des commandes référencent le produit ou l'une de ses variantes. Suppression en cascade des variantes (déjà gérée par Prisma si on delete le Product). |
| **getAvailableProducts** | **Important.** Retourner les "unités vendables" : pour chaque Product, si `variants.length === 0` alors une entrée par produit (id, name, stock, price depuis Product) ; si `variants.length > 0` alors une entrée par **variante** (id = variant.id, productId = product.id, name = `${product.name} – ${variant.name \|\| variant.sku}`, stock = variant.stock, price depuis variant). Typage de retour : `{ id: string, productId: string, productVariantId?: string, name: string, stock: number, price: number }[]` pour que le panier/commande sache si on commande un produit ou une variante. |

---

## 4. Actions commandes (`app/actions/order.ts`)

Convention : une ligne = soit `(productId, productVariantId = null)` soit `(productId, productVariantId = variantId)`. Prix et stock viennent du produit OU de la variante selon `productVariantId`.

| Fonction | Modification |
|----------|---------------|
| **createOrderAction(items)** | Changer la forme de `items` en `{ productId: string, productVariantId?: string \| null, quantity: number }`. Pour chaque item : si `productVariantId` est fourni, charger ProductVariant (et son productId), vérifier stock variante, prix variante, coût variante ; sinon charger Product, stock/prix/coût produit. Créer OrderItem avec `productId` + `productVariantId` optionnel. StockMovement : idem, avec `productVariantId` si variante. Décrémenter le stock du Product **ou** du ProductVariant selon le cas. |
| **updateOrderItemAction** | Récupérer l'orderItem avec `product` et `productVariant`. Déterminer l'entité stock/prix : si `orderItem.productVariantId` alors ProductVariant, sinon Product. Vérifier stock et mettre à jour quantité, prix, coût ; mouvements de stock sur product ou variant selon le cas. |
| **updateOrderItemsAction** | Même logique : pour chaque ligne, résoudre produit vs variante et appliquer stock/prix sur la bonne entité. |
| **addItemsToOrderAction** | Accepter `items: { productId: string, productVariantId?: string \| null, quantity: number }[]`. Même résolution produit/variante pour stock, prix, création OrderItem et StockMovement. |
| **addOrderItemAction(orderId, productId, quantity)** | Signature optionnelle : ajouter un 4e paramètre `productVariantId?: string \| null`. Si fourni, utiliser la variante pour stock/prix et créer l'OrderItem avec productVariantId. |
| **addOrderLinesAction** | Étendre `lines` en `{ productId: string, productVariantId?: string \| null, quantity: number }[]`. Même logique produit/variante. |
| **cancelOrderAction** | Lors du release du stock : pour chaque item, si `item.productVariantId` alors incrémenter `ProductVariant.stock`, sinon `Product.stock`. Créer StockMovement avec `productId` + `productVariantId` optionnel. |

---

## 5. Actions stock (`app/actions/stock.ts`)

| Fonction | Modification |
|----------|---------------|
| **updateStock** | Étendre la signature : `updateStock(productId: string, operation, quantity, reason, productVariantId?: string \| null)`. Si `productVariantId` est fourni, charger ProductVariant (vérifier productId cohérent), appliquer ADD/REMOVE/SET sur `variant.stock`, créer StockMovement avec `productId` + `productVariantId`. Sinon comportement actuel sur Product. |

---

## 6. API Favoris

La contrainte unique FavoriteProduct est passée de `(userId, productId)` à `(userId, productId, productVariantId)`. Les appels Prisma doivent utiliser le nouveau nom de contrainte.

| Fichier | Modification |
|---------|---------------|
| **`app/api/favorites/route.ts`** | **GET** : inclure `productVariant` dans l'include ; retourner pour chaque favori soit le produit soit la variante (affichage nom : produit + variante si présent). **POST** : accepter `{ productId, productVariantId?: string \| null }` ; créer avec `productVariantId` si fourni. Vérifier existence du produit (et de la variante si productVariantId fourni, et que la variante appartient au produit). Utiliser `where: { userId_productId_productVariantId: { userId, productId, productVariantId: productVariantId ?? null } }` pour findUnique/create/delete (nom exact selon le `@@unique` Prisma généré). |
| **`app/api/favorites/check/route.ts`** | Accepter `productId` et optionnellement `productVariantId`. Vérifier favori avec `findFirst({ where: { userId, productId, productVariantId: productVariantId ?? null } })` (ou findUnique si on a un seul champ composite). |

Note : après migration, le nom du `@@unique` Prisma pour FavoriteProduct est `userId_productId_productVariantId`. Vérifier avec `npx prisma generate` et adapter les clés dans `findUnique`/`delete`.

---

## 7. Catalogue et panier (portail)

| Fichier | Modification |
|---------|---------------|
| **`app/portal/page.tsx`** (catalogue) | Requête produits : inclure `variants` (select id, sku, name, stock, priceLabo, priceDentiste, priceRevendeur, cost). Pour l'affichage : si `product.variants.length > 0`, afficher **une carte par variante** (ou une seule carte produit avec sélecteur de variante). Pour chaque "ligne" catalogue : calculer prix/stock soit depuis Product soit depuis ProductVariant ; passer au ProductCard un objet "sellable" (product + variant optionnel) avec price, stock, id pour le panier (productId + productVariantId si variante). |
| **`app/portal/_components/ProductCard.tsx`** | Recevoir une "unité vendable" : soit `{ product, variant?: null }` soit `{ product, variant }`. Afficher nom : `product.name` + (variant ? ` – ${variant.name \|\| variant.sku}` : ''). Stock et prix : variant ou product. Favori : appeler l'API avec `productId` + `productVariantId` si variante. Panier (addToCart) : stocker `productId` + `productVariantId` (optionnel) dans le contexte panier. |
| **`app/portal/CartContext.tsx`** | Étendre `CartItem` avec `productVariantId?: string \| null`. `addToCart(product, quantity, variant?)` ; identifier une ligne par `(productId, productVariantId)` (deux lignes si même produit mais variantes différentes). `removeFromCart(productId, productVariantId?)` et `updateQuantity(productId, productVariantId?, quantity)`. |
| **`app/portal/cart/page.tsx`** | Lors de la création de commande, envoyer `items: { productId, productVariantId?: null, quantity }[]` vers `createOrderAction`. Afficher le nom de la ligne avec le nom de la variante si présent. |

---

## 8. Commandes (portail) – ajout / édition de lignes

| Fichier | Modification |
|---------|---------------|
| **`app/actions/product.ts`** – **getAvailableProducts** | Déjà décrit en §3 : retourner unités vendables (produits seuls ou variantes). |
| **`app/portal/orders/AddProductPanel.tsx`** | Afficher les unités vendables (nom = produit + variante si applicable). Type Product étendu avec `productVariantId?: string`, `id` = id de l'unité (pour variante = variant.id, pour produit = product.id) ; garder `productId` séparé pour l'API. Appel à `addOrderItemAction(orderId, productId, quantity, productVariantId)` ou à `addOrderLinesAction` avec `productVariantId` dans les lignes. |
| **`app/portal/orders/AddOrderLinesModal.tsx`** | Si le modal permet de choisir des produits/variantes, passer `productVariantId` dans les lignes envoyées à `addOrderLinesAction`. |
| **`app/portal/orders/OrderItemCard.tsx`** | Afficher le nom : `item.product.name` + (item.productVariant ? ` – ${item.productVariant.name \|\| item.productVariant.sku}` : ''). Stock pour contrôle : `item.productVariant?.stock ?? item.product.stock`. Inclure `productVariant` dans la requête des items (order avec items include product + productVariant). |
| **`app/portal/orders/OrderEditMode.tsx`** / **OrdersList** | S'assurer que les requêtes order incluent `items: { include: { product: true, productVariant: true } }` pour l'affichage et les contrôles de stock. |

---

## 9. Admin – Produits et variantes

| Fichier | Modification |
|---------|---------------|
| **`app/admin/products/page.tsx`** | Liste : afficher pour chaque produit le nombre de variantes (ex. "3 variantes") ou "Produit simple". Lien vers fiche produit. |
| **`app/admin/products/[id]/page.tsx`** | Afficher les infos produit parent ; section "Variantes" : liste des ProductVariant (sku, name, stock, minStock, prix, coût) avec liens éditer/supprimer. Bouton "Ajouter une variante". Si le produit a des variantes, masquer ou désactiver les champs stock/prix au niveau produit (ou les afficher en lecture seule comme "non utilisés – gérés par variantes"). |
| **`app/admin/products/[id]/EditProductForm.tsx`** | Pas de gestion des variantes dans ce formulaire (uniquement produit parent). Optionnel : afficher un rappel "Ce produit a X variantes ; stock et prix sont gérés par variante." |
| **Nouveaux composants ou pages** | **Création variante** : formulaire (productId, sku, name, stock, minStock, priceLabo, priceDentiste, priceRevendeur, cost). **Édition variante** : même champs. Utiliser les nouvelles actions createVariantAction, updateVariantAction, deleteVariantAction. |

---

## 10. Admin – Stock

| Fichier | Modification |
|---------|---------------|
| **`app/admin/stock/page.tsx`** | Afficher les "unités de stock" : produits sans variante (une ligne par Product) + variantes (une ligne par ProductVariant avec nom produit + variante). Colonnes : nom affiché, SKU, stock, minStock, type (Produit / Variante). |
| **`app/admin/stock/[id]/page.tsx`** | Supporter soit un productId soit un variantId (ex. `?variantId=...` ou route `stock/variant/[id]`). Si variantId : afficher la variante et ses mouvements (filter StockMovement par productVariantId). Formulaire d'ajustement : appeler `updateStock(productId, operation, quantity, reason, productVariantId)`. |
| **`app/admin/stock/[id]/StockAdjustmentForm.tsx`** | Accepter une prop `productVariantId?: string` et la passer à `updateStock`. |

---

## 11. Admin – Commandes

| Fichier | Modification |
|---------|---------------|
| **`app/admin/orders/page.tsx`** | Liste des commandes : pas de changement majeur. Détail des lignes : inclure `productVariant` dans l'include des items pour afficher le nom de la variante. |
| **`app/admin/orders/[id]/page.tsx`** | Inclure `items: { include: { product: true, productVariant: true } }`. Affichage des lignes : nom = product.name + (productVariant ? ` – ${productVariant.name \|\| productVariant.sku}` : ''). |

---

## 12. Magasinier (si utilisé)

| Fichier | Modification |
|---------|---------------|
| **`app/magasinier/stock/page.tsx`** et **`[id]/page.tsx`** | Même logique que admin stock : afficher et gérer le stock par variante (lignes variantes + produits simples). Ajustement avec `productVariantId` si nécessaire. |

---

## 13. Autres références

| Fichier | Modification |
|---------|---------------|
| **`app/portal/favorites/FavoritesPageClient.tsx`** | Afficher le nom du favori : produit + variante si `favorite.productVariantId` (charger productVariant et afficher son nom/sku). Lien/ajout panier avec productId + productVariantId. |
| **Emails / PDF** | Si les emails ou documents (BL, facture) listent les lignes de commande, inclure le nom de la variante (item.product.name + item.productVariant?.name ou sku). Vérifier `lib/email.ts` et les templates d'impression (delivery-note, invoice). |

---

## 14. Ordre de mise en œuvre recommandé

1. **Lib** : `pricing.ts` + helpers variant (optionnel `variant-utils.ts`).
2. **SKU global** : vérification dans product.ts + actions variantes (create/update/delete variant).
3. **getAvailableProducts** : retourner unités vendables (produits + variantes).
4. **order.ts** : createOrderAction, addOrderItemAction, addOrderLinesAction, addItemsToOrderAction, updateOrderItemAction, updateOrderItemsAction, cancelOrderAction (stock sur produit ou variante).
5. **stock.ts** : updateStock avec productVariantId.
6. **API favorites** : GET/POST/DELETE et check avec productVariantId ; adapter le nom du `@@unique` après migration.
7. **Catalogue** : portal page + ProductCard + CartContext + cart page (items avec productVariantId).
8. **Portail commandes** : AddProductPanel, AddOrderLinesModal, OrderItemCard, requêtes avec productVariant.
9. **Admin produits** : page détail produit + CRUD variantes (formulaires et actions).
10. **Admin stock** : liste par unité (produit/variante), détail et ajustement avec productVariantId.
11. **Admin commandes** : affichage des lignes avec nom variante.
12. **Favoris portail** : FavoritesPageClient.
13. **Emails / PDF** : libellés des lignes avec variante.

Ce plan garde la rétrocompatibilité : les produits sans variante et les OrderItem sans `productVariantId` se comportent comme aujourd'hui.
