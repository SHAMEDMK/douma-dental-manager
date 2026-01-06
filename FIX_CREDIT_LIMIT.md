# Fix: Prisma Client - creditLimit non reconnu

## Problème
Le client Prisma ne reconnaît pas le champ `creditLimit` car il n'a pas été régénéré après l'ajout du champ dans le schéma.

## Solution

**Étape 1 : Arrêter le serveur de développement**
- Appuyez sur `Ctrl+C` dans le terminal où Next.js tourne

**Étape 2 : Régénérer le client Prisma**
```bash
npx prisma generate
```

**Étape 3 : Redémarrer le serveur**
```bash
npm run dev
```

## Vérification

La colonne `creditLimit` existe déjà dans la base de données (vérifié ✅).
Une fois le client Prisma régénéré, l'erreur devrait disparaître.

## Alternative (si le problème persiste)

Si `prisma generate` échoue toujours, vous pouvez :
1. Supprimer le dossier `.next` : `rm -rf .next` (ou `Remove-Item -Recurse -Force .next` sur Windows)
2. Supprimer `node_modules/.prisma` : `rm -rf node_modules/.prisma`
3. Régénérer : `npx prisma generate`
4. Redémarrer : `npm run dev`

