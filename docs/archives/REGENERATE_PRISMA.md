# Régénérer le client Prisma

## Problème
Le fichier `query_engine-windows.dll.node` est bloqué par le serveur Next.js en cours d'exécution.

## Solution

**Étape 1 : Arrêter le serveur Next.js**
- Dans le terminal où `npm run dev` tourne, appuyez sur `Ctrl+C`
- Attendez que le serveur s'arrête complètement

**Étape 2 : Régénérer le client Prisma**
```bash
npx prisma generate
```

**Étape 3 : Redémarrer le serveur**
```bash
npm run dev
```

## Alternative (si le problème persiste)

Si après avoir arrêté le serveur, `prisma generate` échoue encore :

```bash
# 1. Arrêter complètement le serveur (Ctrl+C)

# 2. Supprimer le dossier .prisma
Remove-Item -Recurse -Force node_modules\.prisma

# 3. Régénérer
npx prisma generate

# 4. Redémarrer
npm run dev
```

## Vérification

Une fois le serveur redémarré, le client Prisma devrait être à jour avec le champ `creditLimit` et l'erreur "Internal Server Error" devrait disparaître.

