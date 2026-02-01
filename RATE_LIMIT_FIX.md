# Fix Rate Limiting - Navigation bloquée

## Problème
Le rate limiting bloque la navigation normale sur `/admin/*` même pour les requêtes GET.

## Solution appliquée
Le code a été modifié pour **exclure les requêtes GET de navigation** du rate limiting ADMIN.

### Changements dans `proxy.ts`:
- Les requêtes GET vers les pages `/admin/*` ne sont plus rate limitées
- Seules les actions (POST, PUT, DELETE) et les routes API sont rate limitées

## Si le problème persiste

### Option 1: Redémarrer le serveur
Le rate limiting utilise un store in-memory. Redémarrer le serveur réinitialise tous les compteurs.

```bash
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm run dev
```

### Option 2: Attendre la fin de la fenêtre
Le rate limit se réinitialise automatiquement après la fenêtre de temps (1 minute pour ADMIN).

### Option 3: Vérifier les routes API
Les routes `/api/admin/*` ont leur propre rate limiting. Vérifiez si le problème vient d'une route API spécifique.

## Vérification
Après le redémarrage, la navigation normale sur `/admin/*` ne devrait plus être bloquée.
