# Vérification des optimisations performance

Ce fichier décrit comment vérifier que les optimisations (index, pagination, exports) améliorent bien les perfs, sans casser seed ni E2E.

Référence complète : **docs/PERF_AUDIT.md**.

---

## Après PR1 (index uniquement)

### 1. Appliquer la migration

```bash
# PostgreSQL (dev ou staging)
npx prisma migrate deploy
# ou en dev avec historique
npx prisma migrate dev --name perf_indexes
```

### 2. Vérifier que rien ne casse

- **Seed** : `npm run db:seed` (ou `E2E_SEED=1 npm run db:seed` pour les mots de passe E2E) doit terminer sans erreur.
- **E2E** : `npm run test:e2e` (ou `npm run test:e2e:ci`) doit rester vert. Les index ne changent pas le comportement fonctionnel.

### 3. Temps de réponse (optionnel)

- **Listes** : Ouvrir en tant qu’admin les pages Commandes, Factures, Paiements. Dans l’onglet Network (DevTools), noter le temps de la requête GET de la page (ou du data fetch). Refaire après migration : les requêtes avec `orderBy: { createdAt: 'desc' }` et filtres sur `status` / `userId` devraient utiliser les nouveaux index.
- **Exports** : Appeler `GET /api/admin/export/orders` (avec cookie admin). Comparer le temps de réponse avant/après. En base plus grosse, la différence sera plus visible.

---

## Après PR2 (pagination / requêtes)

- **Pagination** : Vérifier que les listes (orders, invoices, payments) affichent une limite (ex. 25 ou 50) et un lien “Page suivante” / numéros de page. Charger la page 2 et vérifier que les données changent.
- **Temps** : La première page doit rester rapide (< 1–2 s) même avec beaucoup de données.

---

## Après PR3 (exports streaming / jobs, optionnel)

- **Export gros volume** : Générer un export avec un volume réaliste (ex. 1k commandes). Vérifier absence de timeout (Vercel 10s/60s selon plan) et pas de pic mémoire excessif (ex. via logs ou monitoring).

---

## Résumé

| Étape   | Action de vérification                          |
|--------|---------------------------------------------------|
| PR1    | `prisma migrate deploy` + `db:seed` + `test:e2e` |
| PR1    | (Optionnel) Mesurer temps listes / exports        |
| PR2    | Vérifier pagination et temps première page        |
| PR3    | Vérifier export gros volume sans timeout          |
