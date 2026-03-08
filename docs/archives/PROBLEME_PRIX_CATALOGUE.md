# Analyse du problème de prix dans le catalogue

## Problème signalé
- **Prix de vente du produit ALCOOL** : 250 Dh
- **Prix affiché sur le catalogue** : 255 Dh (selon le client et/ou son segment)
- **Écart** : +5 Dh (2% d'augmentation)

## Analyse du code actuel

### 1. Calcul du prix dans le catalogue (`app/portal/page.tsx`)

Le prix est calculé en plusieurs étapes :

```typescript
// Étape 1 : Récupération du prix de base selon le segment
let priceHT = getPriceForSegment(product, segment)

// Étape 2 : Application de la remise client (si applicable)
if (discountRate && discountRate > 0) {
  priceHT = priceHT * (1 - discountRate / 100)
}

// Étape 3 : Calcul du prix TTC pour affichage
const priceTTC = Math.round((priceHT * (1 + vatRate)) * 100) / 100
```

### 2. Fonction `getPriceForSegment` (`app/lib/pricing.ts`)

Cette fonction détermine le prix selon l'ordre de priorité suivant :

1. **ProductPrice table** (nouveau système) : Cherche un prix spécifique pour le segment du client
2. **Champs legacy** : `priceLabo`, `priceDentiste`, `priceRevendeur`
3. **Fallback** : `product.price` (champ legacy)

### 3. Affichage dans ProductCard (`app/portal/_components/ProductCard.tsx`)

```typescript
{product.priceTTC ? product.priceTTC.toFixed(2) : product.price.toFixed(2)} Dh TTC
```

## Causes possibles du problème

### Hypothèse 1 : Prix de base incorrect dans la base de données
- Le produit ALCOOL pourrait avoir un prix de 255 dans `ProductPrice` pour le segment du client
- Ou un prix de 255 dans `priceLabo`/`priceDentiste`/`priceRevendeur`
- **Vérification nécessaire** : Consulter la base de données pour le produit ALCOOL

### Hypothèse 2 : Remise appliquée à l'envers
- Si le prix de base est 250 et qu'une remise de 2% est appliquée, le prix devrait être 245 HT
- Mais si la remise est mal appliquée (addition au lieu de soustraction), on aurait : 250 * (1 + 2/100) = 255
- **Vérification** : Le code actuel utilise `(1 - discountRate / 100)`, ce qui est correct

### Hypothèse 3 : Problème avec le calcul TTC
- Si le prix HT est 250 et qu'on applique la TVA (20%), on obtient 300 TTC
- Mais l'utilisateur mentionne 255, ce qui suggère un problème différent
- **Note** : Le catalogue affiche le prix TTC, mais l'utilisateur mentionne peut-être le prix HT

### Hypothèse 4 : Prix différent selon le segment
- Le client pourrait avoir un segment différent (DENTISTE ou REVENDEUR) avec un prix de 255
- Le prix LABO serait 250, mais le prix pour le segment du client serait 255
- **Vérification nécessaire** : Vérifier le segment du client et les prix par segment du produit ALCOOL

## Solutions proposées

### Solution 1 : Vérification et correction des données (RECOMMANDÉ EN PREMIER)

**Actions à effectuer :**
1. Vérifier dans la base de données :
   - Le prix du produit ALCOOL dans `Product.price`
   - Les prix par segment dans `ProductPrice` pour ALCOOL
   - Les prix legacy (`priceLabo`, `priceDentiste`, `priceRevendeur`) pour ALCOOL
   - Le segment du client concerné
   - La remise (`discountRate`) du client concerné

2. Identifier la source du prix 255 :
   - Si c'est dans `ProductPrice` pour le segment du client → Corriger à 250
   - Si c'est dans les champs legacy → Corriger à 250
   - Si c'est un calcul incorrect → Voir Solution 2

### Solution 2 : Ajouter un logging pour debug

Ajouter des logs temporaires dans `app/portal/page.tsx` pour tracer le calcul :

```typescript
const productsWithPrices = products.map(product => {
  let priceHT = getPriceForSegment(product, segment as any)
  console.log(`[DEBUG] Product ${product.name}: base price = ${priceHT}, segment = ${segment}`)
  
  if (discountRate && discountRate > 0) {
    const priceBeforeDiscount = priceHT
    priceHT = priceHT * (1 - discountRate / 100)
    console.log(`[DEBUG] Applied discount ${discountRate}%: ${priceBeforeDiscount} -> ${priceHT}`)
  }
  
  const priceTTC = Math.round((priceHT * (1 + vatRate)) * 100) / 100
  console.log(`[DEBUG] Final TTC: ${priceTTC}`)
  
  return { ...product, price: priceHT, priceTTC, vatRate }
})
```

### Solution 3 : Afficher le prix HT ET TTC dans le catalogue

Modifier `ProductCard.tsx` pour afficher clairement :
- Prix HT (avec remise si applicable)
- Prix TTC
- Remise appliquée (si applicable)

Cela permettra de mieux comprendre ce qui est affiché.

### Solution 4 : Créer un script de vérification

Créer un script `scripts/check-product-prices.js` qui :
1. Liste tous les produits avec leurs prix par segment
2. Vérifie les incohérences
3. Affiche un rapport détaillé

## Recommandation immédiate

**ÉTAPE 1** : Vérifier les données dans la base de données pour le produit ALCOOL :
- Ouvrir Prisma Studio ou utiliser une requête SQL
- Vérifier `Product.price`, `ProductPrice`, et les champs legacy
- Vérifier le segment et la remise du client concerné

**ÉTAPE 2** : Une fois la cause identifiée, appliquer la solution appropriée :
- Si c'est une erreur de données → Corriger directement en base
- Si c'est un bug de calcul → Corriger le code
- Si c'est une confusion HT/TTC → Clarifier l'affichage

## Questions à clarifier

1. Le prix de 250 est-il le prix HT ou TTC ?
2. Le prix de 255 affiché est-il HT ou TTC ?
3. Quel est le segment du client qui voit 255 ?
4. Le client a-t-il une remise (`discountRate`) configurée ?
5. Le produit ALCOOL a-t-il des prix différents selon les segments ?
