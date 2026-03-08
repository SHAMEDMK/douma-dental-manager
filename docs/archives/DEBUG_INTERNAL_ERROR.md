# Debug: Internal Server Error

## Améliorations apportées

1. **Gestion d'erreur améliorée dans `getUserCreditInfo`**
   - Retourne des valeurs par défaut en cas d'erreur au lieu de planter
   - Gère le cas où `creditLimit` n'existe pas encore

2. **Gestion d'erreur améliorée dans `createOrderAction`**
   - Fallback pour `creditLimit` avec `(user as any)?.creditLimit ?? 0`
   - Meilleur logging des erreurs

3. **Gestion d'erreur dans `cart/page.tsx`**
   - Catch des erreurs dans le `useEffect`
   - Affichage conditionnel des infos de crédit

## Pour identifier l'erreur exacte

**Vérifiez les logs du serveur Next.js** dans le terminal où `npm run dev` tourne. L'erreur exacte devrait y apparaître.

**Pages à vérifier :**
- `/portal/cart` - Si l'erreur vient de `getUserCreditInfo`
- `/admin/clients/invite` - Si l'erreur vient de `createInvitation`
- `/portal` - Si l'erreur vient d'une autre action

## Solutions possibles

1. **Si l'erreur vient de `creditLimit` non reconnu :**
   - Vérifier que `npx prisma generate` a bien été exécuté
   - Redémarrer le serveur Next.js

2. **Si l'erreur vient de la base de données :**
   - Vérifier que la colonne existe : la migration devrait l'avoir créée
   - Si elle n'existe pas, appliquer manuellement : `ALTER TABLE User ADD COLUMN creditLimit REAL NOT NULL DEFAULT 0;`

3. **Si l'erreur est générique :**
   - Vérifier les logs du serveur pour l'erreur exacte
   - Vérifier que toutes les dépendances sont installées

