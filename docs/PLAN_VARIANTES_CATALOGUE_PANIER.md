# Plan : Catalogue par variété + choix Teinte/Dimension dans le panier

## Contexte

- **Catalogue** : le client ne voit que les **variétés** (ex. Zircone HT, HTML, 3D PRO…), pas les 210 combinaisons.
- **Clic sur une variété** : ajout au panier avec uniquement la variété fixée.
- **Panier** : sur la ligne, le client choisit **Teinte** et **Dimension** ; la ligne se résout en une variante (SKU, prix, stock).
- **Prix** : déterminé par Variété + Dimension (la Teinte n’a pas d’effet sur le prix).

---

## Phase 0 : Prérequis (vous : backup)

- [ ] Sauvegarde base de données (et code si besoin) avant toute modification.

---

## Phase 1 : Données et options

### 1.1 Ordre des options

- **Fichier** : `prisma/schema.prisma`
- **Action** : Ajouter un champ `order Int @default(0)` sur `ProductOption` pour imposer l’ordre d’affichage (ex. 1 = Variété, 2 = Teinte, 3 = Dimension).
- **Migration** : `npx prisma migrate dev --name add_option_order`
- **Objectif** : Pouvoir afficher toujours Variété → Teinte → Dimension (catalogue, panier, admin).

### 1.2 Identifier les options par rôle (optionnel mais recommandé)

- **Option A** : Convention par **ordre** : option 1 = Variété, 2 = Teinte, 3 = Dimension.
- **Option B** : Convention par **nom** : chercher l’option dont le nom contient "Variété" / "Teinte" / "Dimension" (ou égalité exacte).
- **Recommandation** : Utiliser l’**ordre** (1, 2, 3) pour ne pas dépendre de la langue. Documenter dans le seed/admin que l’ordre 1 = Variété, 2 = Teinte, 3 = Dimension.

### 1.3 Mise à jour du seed / génération Zircone

- S’assurer que les options sont créées avec le bon `order` (Variété=1, Teinte=2, Dimension=3).
- Générer les variantes (ex. 210) avec `generateVariantsFromOptionsAction` (déjà en place).
- Format SKU : `ZIRCONE-{VARIETE}-{TEINTE}-{DIMENSION}` (espaces remplacés par tirets, ex. `3D-PRO`).

---

## Phase 2 : Panier « configurable »

### 2.1 Modèle du panier (localStorage + type TypeScript)

- **Fichier** : `app/portal/CartContext.tsx`
- **Type `CartItem` actuel** : `productId`, `productVariantId?`, `name`, `price`, `quantity`, …
- **Extension** : Ajouter un champ optionnel pour les lignes non encore résolues, par exemple :
  - `pendingVariant?: { varieteOptionValueId: string }`  
  ou
  - `pendingVariant?: { varieteValueId: string; teinteValueId?: string; dimensionValueId?: string }`
- **Clé de ligne** : Tant que la variante n’est pas résolue, la clé doit rester unique par produit + variété (ex. `productId:varieteOptionValueId`). Quand la variante est résolue, on bascule sur `productId:productVariantId` comme aujourd’hui.
- **Règles** :
  - Si `productVariantId` est défini → ligne classique (prix, SKU, stock connus).
  - Si `pendingVariant` est défini (variété seule ou variété + teinte + dimension) → ligne « configurable » ; tant que teinte et dimension ne sont pas choisis, pas de `productVariantId` ni de prix définitif (on peut afficher « À configurer » ou « À partir de X Dh » si vous calculez un min par variété).

### 2.2 Résolution variante (backend)

- **Fichier** : `app/actions/` (ex. `product.ts` ou `client.ts`)
- **Action** : `resolveVariantFromOptions(productId, varieteOptionValueId, teinteOptionValueId, dimensionOptionValueId)`  
  - Retourne la variante (ProductVariant) dont les `ProductVariantOptionValue` correspondent exactement à ces trois valeurs (et dans le bon ordre d’options).
  - Retourne `null` ou erreur si combinaison invalide.
- **Utilisation** : côté panier (voir 2.4) et éventuellement côté catalogue pour afficher « à partir de X Dh » par variété.

### 2.3 Ajout au panier « par variété » (catalogue)

- **Fichier** : `app/portal/_components/ProductCard.tsx` (ou nouveau composant pour les produits « par variété »)
- **Contexte** : Le catalogue doit exposer des **unités par variété** pour les produits qui ont 3 options (Variété, Teinte, Dimension). Chaque unité = un produit + une valeur d’option « Variété » (option d’ordre 1).
- **Données** : 
  - Soit adapter `getSellableUnits` / la page catalogue pour qu’elle retourne, pour certains produits, une entrée par **variété** (avec `varieteOptionValueId` ou équivalent) au lieu d’une entrée par variante.
  - Soit introduire une fonction du type `getSellableUnitsByVariety(product)` qui retourne une liste `{ productId, varieteOptionValueId, varieteLabel, minPrice? }`.
- **Ajout au panier** : Au clic « Ajouter », appeler `addToCart` avec un objet qui contient `productId`, `pendingVariant: { varieteOptionValueId }`, `name` (ex. « Zircone HT »), pas de `productVariantId`, et un `price` optionnel (0 ou « à définir » ou prix minimum variété). Le `CartContext` devra accepter ce format et créer une ligne avec `pendingVariant` et sans `productVariantId`.

### 2.4 Page panier : choix Teinte et Dimension

- **Fichier** : `app/portal/cart/page.tsx` (et composants associés, ex. ligne de panier)
- **Affichage** : Pour chaque ligne avec `pendingVariant` et sans `productVariantId` :
  - Afficher le nom (ex. « Zircone HT »).
  - Afficher deux listes déroulantes : **Teinte**, **Dimension** (valeurs chargées depuis les options du produit, ordre 2 et 3).
  - Optionnel : afficher un prix « À partir de X Dh » tant que la dimension n’est pas choisie ; dès que Teinte + Dimension sont choisis, appeler `resolveVariantFromOptions`, mettre à jour la ligne avec `productVariantId`, `price`, `name` (nom de la variante ou produit + variante), et retirer `pendingVariant`.
- **Sauvegarde** : Mettre à jour le state du panier (et donc localStorage) avec la ligne résolue ou encore en attente.

### 2.5 Validation avant commande

- **Fichier** : page de validation de commande / checkout (ex. `app/portal/cart/page.tsx` au clic « Commander », ou page dédiée).
- **Règle** : Aucune ligne ne doit rester avec `pendingVariant` sans `productVariantId`. Si une telle ligne existe, bloquer et afficher un message : « Veuillez choisir la teinte et la dimension pour [nom du produit / variété]. »
- **Côté serveur** : Lors de la création de la commande (ex. `app/actions/order.ts`), refuser les lignes sans `productVariantId` quand le produit a des variantes (ou refuser toute ligne avec `pendingVariant`).

---

## Phase 3 : Catalogue « par variété »

### 3.1 Décider quels produits sont affichés par variété

- **Règle métier** : Les produits avec exactement 3 options (ordre 1 = Variété, 2 = Teinte, 3 = Dimension) sont affichés **au niveau variété** sur le catalogue. Les autres produits restent comme aujourd’hui (produit simple ou une carte par variante).
- **Implémentation** : Dans la page catalogue (`app/portal/page.tsx`) ou dans une fonction partagée :
  - Pour chaque produit, déterminer s’il a 3 options avec le bon ordre (ou les bons noms).
  - Si oui : utiliser `getSellableUnitsByVariety(product)` et afficher une carte par variété.
  - Si non : garder `getSellableUnits(product)` et afficher une carte par produit ou par variante comme actuellement.

### 3.2 Composant carte « par variété »

- Soit étendre `ProductCard` pour accepter un mode « variété » (pas de variante, seulement `productId` + `varieteOptionValueId` + libellé + prix min).
- Soit créer un composant `ProductCardByVariety` qui affiche une variété et, au clic sur « Ajouter au panier », appelle `addToCart` avec `pendingVariant: { varieteOptionValueId }` (voir 2.3).

### 3.3 Prix « à partir de » (optionnel)

- Pour chaque variété, calculer le prix minimum parmi toutes les variantes de cette variété (ex. min par dimension). Afficher « À partir de X Dh » sur la carte catalogue. Optionnel pour la V1.

---

## Phase 4 : Commandes et persistance

### 4.1 Création de commande

- **Fichier** : `app/actions/order.ts` (ou équivalent)
- **Règle** : Chaque ligne de panier doit avoir un `productVariantId` (pour les produits à variantes) avant de créer l’`OrderItem`. Refuser la création si une ligne contient encore `pendingVariant` sans variante résolue.
- **OrderItem** : Continuer à enregistrer `productId`, `productVariantId`, `quantity`, `priceAtTime` comme aujourd’hui. Aucun champ « pending » en base : tout est résolu en variante avant création de la commande.

### 4.2 Facturation / BL

- Aucun changement nécessaire si les lignes de commande sont déjà des variantes (SKU, nom variante disponibles via `productVariant`). Vérifier que les documents (facture, BL) affichent bien le nom/SKU de la variante.

---

## Phase 5 : Admin (optionnel pour la V1)

- **Liste des variantes** : Déjà paginée ; éventuellement ajouter des filtres par Variété / Teinte / Dimension pour faciliter la recherche.
- **Ordre des options** : Dans l’onglet Options du produit, permettre de modifier l’ordre (champ `order`) pour que Variété=1, Teinte=2, Dimension=3.

---

## Ordre recommandé des tâches

1. **Phase 0** : Backup (vous).
2. **Phase 1** : Schéma (order), migration, seed Zircone si besoin.
3. **Phase 2.2** : Action `resolveVariantFromOptions`.
4. **Phase 2.1** : Extension du type `CartItem` et de la logique du panier (lignes « configurable », clé, mise à jour).
5. **Phase 2.3** : Catalogue qui expose des unités par variété et `addToCart` avec `pendingVariant`.
6. **Phase 2.4** : Page panier : dropdowns Teinte/Dimension et résolution vers variante.
7. **Phase 2.5** : Validation avant commande (client + serveur).
8. **Phase 3** : Affiner l’affichage catalogue (cartes par variété, prix min si besoin).
9. **Phase 4** : Vérifier création commande et documents.
10. **Phase 5** : Améliorations admin si besoin.

---

## Fichiers principaux à modifier (résumé)

| Fichier | Rôle |
|--------|------|
| `prisma/schema.prisma` | Champ `order` sur `ProductOption`. |
| `app/portal/CartContext.tsx` | Type `CartItem` étendu, `addToCart` et clé pour lignes configurable, résolution et mise à jour de ligne. |
| `app/actions/product.ts` ou `client.ts` | `resolveVariantFromOptions(productId, variete, teinte, dimension)`. |
| `app/portal/page.tsx` + logique catalogue | Exposer unités par variété pour produits 3-options ; utiliser `getSellableUnitsByVariety` ou équivalent. |
| `app/portal/_components/ProductCard.tsx` ou nouveau composant | Carte « par variété » et ajout au panier avec `pendingVariant`. |
| `app/portal/cart/page.tsx` (+ composant ligne panier) | Dropdowns Teinte/Dimension, appel résolution, mise à jour de la ligne. |
| `app/actions/order.ts` | Refus des lignes non résolues (pending) à la création de commande. |
| Optionnel : `app/admin/products/[id]/options` | Gestion de l’ordre des options. |

---

## Points de vigilance

- **Compatibilité** : Les produits sans variantes ou avec un seul niveau d’option continuent à fonctionner comme aujourd’hui (une ligne = une variante ou un produit).
- **Stock** : Tant que la variante n’est pas résolue, pas de déduction de stock ; à la résolution (choix teinte + dimension), afficher le stock de la variante et empêcher la commande si rupture.
- **Prix** : Ne pas valider le montant de la commande tant que toutes les lignes n’ont pas un prix définitif (variante résolue).

Ce plan peut être suivi phase par phase ; après chaque phase, tests manuels (catalogue → panier → résolution → commande) pour valider le flux.
