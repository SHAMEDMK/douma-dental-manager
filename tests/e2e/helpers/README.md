# E2E helpers

Dossier pour les helpers partagés entre specs E2E.

- **Règle :** n’ajouter que des helpers **utilisés** par au moins un spec (pas de code mort).
- **Auth :** les tests privilégient `storageState` (auth-setup) ; les helpers de login UI ne sont ajoutés que si un spec en a besoin sans storageState.
