# Protection des branches (Branch Protection)

Pour éviter de merger des PR avec des checks rouges, active la protection de la branche `main`.

## Étapes (GitHub)

1. Va sur **Settings** → **Branches** du dépôt
2. Clique **Add branch protection rule** (ou modifie la règle existante pour `main`)
3. **Branch name pattern** : `main`
4. Coche :
   - **Require a pull request before merging**
   - **Require status checks to pass before merging**
5. Dans **Status checks that are required**, ajoute :
   - `ci` (nom du job dans `.github/workflows/ci.yml`)
6. Optionnel : **Require branches to be up to date before merging**
7. **Create** / **Save changes**

## Résultat

- Les PR ne pourront plus être mergées si la CI échoue
- Chaque push déclenche la CI ; le merge n’est possible que lorsque tous les checks sont verts

## Vérifier la CI en local

Avant de pousser, exécute :

```bash
npm run lint
npm run build
npm run test:e2e   # avec PostgreSQL démarré et E2E_SEED=1
```
