# Instructions pour résoudre l'erreur creditLimit

## ✅ État actuel
- ✅ Le schéma Prisma contient `creditLimit`
- ✅ La colonne existe dans la base de données
- ✅ Le client Prisma a été régénéré avec `creditLimit`
- ✅ Le cache `.next` a été supprimé

## 🔄 Action requise

**Redémarrer le serveur Next.js** pour que Turbopack recharge le client Prisma mis à jour :

1. **Arrêter le serveur** (si encore en cours) : `Ctrl+C` dans le terminal
2. **Redémarrer** :
   ```bash
   npm run dev
   ```

## 🔍 Vérification

Après redémarrage, essayez de créer un nouveau client avec un plafond de crédit. L'erreur devrait disparaître.

## ⚠️ Si l'erreur persiste

Si après redémarrage l'erreur persiste, essayez :

```bash
# 1. Arrêter le serveur (Ctrl+C)

# 2. Supprimer complètement le cache
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules\.prisma

# 3. Régénérer Prisma
npx prisma generate

# 4. Redémarrer
npm run dev
```

