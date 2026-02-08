# Conception : variantes de produits

## Objectif

Permettre à un même produit (ex. "Couronne céramique") d'avoir plusieurs **variantes** (ex. teinte A2, A3, taille 12, 14) avec chacune :
- un **SKU** propre
- un **stock** et **seuils** propres
- des **prix** par segment (LABO, DENTISTE, REVENDEUR) et un **coût** propres

Les commandes, mouvements de stock et favoris peuvent porter sur une **variante** plutôt que sur le produit générique.

## Choix d’architecture

- **Product** = produit “parent” (nom, description, catégorie, image). Il peut être vendu tel quel (sans variantes) ou via des variantes.
- **ProductVariant** = variante vendable : SKU unique, stock, minStock, prix par segment, coût. Toujours liée à un Product.
- **OrderItem** : on conserve `productId` pour affichage et compatibilité ; on ajoute **productVariantId** optionnel. Si présent, la ligne commande la variante (prix/stock de la variante) ; sinon la ligne commande le produit simple (comportement actuel).
- **StockMovement** : idem, **productVariantId** optionnel. Si présent, le mouvement s’applique au stock de la variante.
- **FavoriteProduct** : **productVariantId** optionnel pour mettre en favori une variante précise.

Les **ProductPrice** (prix par segment) restent sur **Product** pour les produits sans variante. Pour les variantes, les prix sont sur **ProductVariant** (champs priceLabo, priceDentiste, priceRevendeur), ce qui évite une table ProductVariantPrice pour rester simple.

Optionnel pour plus tard : **ProductOption** (ex. "Teinte", "Taille") et **ProductOptionValue** (ex. "A2", "12") pour décrire les variantes et filtrer dans le catalogue. Le schéma ci‑dessous les inclut en option.

## Résumé des changements Prisma

| Modèle / champ | Action |
|----------------|--------|
| **Product** | Inchangé (legacy). Ajout de la relation `variants ProductVariant[]`. Les champs stock/prix restent pour les produits sans variante. |
| **ProductVariant** | **Nouveau** : productId, sku (unique), name (suffixe affiché), stock, minStock, priceLabo, priceDentiste, priceRevendeur, cost. Relations : orderItems, stockMovements, optionValues (optionnel). |
| **OrderItem** | Ajout de `productVariantId String?` et relation `productVariant ProductVariant?`. Si `productVariantId` est set, la ligne référence la variante. |
| **StockMovement** | Ajout de `productVariantId String?` et relation `productVariant ProductVariant?`. |
| **FavoriteProduct** | Ajout de `productVariantId String?` et relation `productVariant ProductVariant?`. |
| **ProductOption** (optionnel) | **Nouveau** : productId, name (ex. "Teinte"). |
| **ProductOptionValue** (optionnel) | **Nouveau** : optionId, value (ex. "A2"). |
| **ProductVariantOptionValue** (optionnel) | **Nouveau** : variantId, optionValueId. Lie une variante à des valeurs d’options (ex. Teinte A2). |

## Règles métier à appliquer en code

1. **Produit sans variante** : `product.variants.length === 0`. Stock et prix sur Product ; OrderItem avec `productVariantId == null`.
2. **Produit avec variantes** : stock et prix par variante ; OrderItem doit avoir `productVariantId` set (une des variantes du produit).
3. **Affichage catalogue** : produit avec variantes = une fiche produit avec choix de variante (SKU, prix, stock de la variante sélectionnée).
4. **Unicité SKU** : globale (Product.sku et ProductVariant.sku) : un même SKU ne peut pas exister à la fois sur un produit et sur une variante.

## Implémentation

- **Schéma Prisma** : Implémenté dans `prisma/schema.prisma` (ProductVariant, ProductOption, ProductOptionValue, ProductVariantOptionValue ; champs optionnels `productVariantId` sur OrderItem, StockMovement, FavoriteProduct).
- **Migration** : `prisma/migrations/20260201000000_add_product_variants/migration.sql`. Pour FavoriteProduct, la contrainte unique est `(userId, productId, productVariantId)` ; un index partiel unique `(userId, productId) WHERE productVariantId IS NULL` évite les doublons favori "produit sans variante" (SQLite traite les NULL comme distincts dans un index unique normal).
- **À faire en code** : voir **Plan d'implémentation détaillé** dans `docs/PLAN_IMPLEMENTATION_VARIANTES.md`. Résumé : adapter les actions (product, order, stock), les requêtes catalogue et l'UI admin/portal pour gérer les variantes et appliquer les règles métier ci-dessus., et l’UI admin/portal pour gérer les variantes et appliquer les règles métier ci-dessus.
