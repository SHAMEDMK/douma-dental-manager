# Fix: Erreur Turbopack après suppression du cache

## Problème
Le cache `.next` a été supprimé pendant que le serveur tournait, causant une corruption.

## Solution

**Étape 1 : Vérifier que le serveur est arrêté**
- Si le serveur tourne encore, arrêtez-le avec `Ctrl+C`

**Étape 2 : Redémarrer le serveur**
```bash
npm run dev
```

Le serveur va recréer le cache `.next` proprement avec le client Prisma mis à jour.

## Vérification

Une fois le serveur redémarré :
- Le cache `.next` sera recréé automatiquement
- Turbopack chargera le nouveau client Prisma avec `creditLimit`
- L'erreur `Unknown argument creditLimit` devrait disparaître

## Si le problème persiste

Si l'erreur persiste après redémarrage :

```bash
# 1. Arrêter complètement le serveur
# 2. Supprimer node_modules/.prisma
Remove-Item -Recurse -Force node_modules\.prisma

# 3. Régénérer Prisma
npx prisma generate

# 4. Redémarrer
npm run dev
```

