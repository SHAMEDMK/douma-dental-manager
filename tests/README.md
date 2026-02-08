# Tests - DOUMA Dental Manager

## Structure des Tests

```
tests/
├── setup.ts                    # Configuration globale des tests
├── integration/                # Tests d'intégration
│   └── order-workflow.test.ts  # Workflows critiques
├── e2e/                        # Tests end-to-end (Playwright)
│   ├── auth.spec.ts            # Tests d'authentification
│   └── order-workflow.spec.ts  # Workflows complets
└── README.md                   # Ce fichier

app/lib/__tests__/             # Tests unitaires
├── sequence.test.ts           # Tests des numéros de séquence
├── pricing.test.ts            # Tests des prix par segment
├── tax.test.ts                # Tests des calculs de TVA
└── invoice-utils.test.ts      # Tests des utilitaires de facturation
```

## Commandes Disponibles

### Tests Unitaires
```bash
# Lancer les tests en mode watch
npm run test

# Lancer les tests une fois
npm run test:run

# Lancer avec interface UI
npm run test:ui

# Lancer avec couverture de code
npm run test:coverage
```

### Tests E2E (Playwright)

Guide complet : **docs/E2E_DOUMA_GUIDE.md** (commandes, workflow, comptes, ECONNRESET, améliorations).

```bash
npm run test:e2e

# Lancer avec interface UI
npm run test:e2e:ui

# Réinitialiser les mots de passe E2E manuellement (admin=password, client=password123, etc.)
npm run db:seed:e2e
```
Les tests E2E s’attendent à : `admin@douma.com` / `password`, `client@dental.com` / `password123`. Le script `test:e2e` définit `E2E_SEED=1` pour que le seed applique ces mots de passe ; ne pas mettre `E2E_SEED` dans `.env`.

**Workflow** : quotidien `test:e2e`, serveur frais `test:e2e:fresh`, avant merge `test:e2e:ci`. Détail : **docs/E2E_DOUMA_GUIDE.md**.

### Seed E2E et isolation des tests

Quand `E2E_SEED=1`, le seed crée en plus une commande **PREPARED** (`CMD-E2E-PREPARED`, BL `BL-E2E-0001`) pour le client de test. Elle est utilisée uniquement par `workflow.order-to-prepared.spec.ts`, qui vérifie qu’une commande Préparée est bien affichée avec son BL côté admin. La **transition CONFIRMED → PREPARED** (clic « Préparer ») est couverte par d’autres specs : `order-workflow.spec.ts`, `delivery-workflow.spec.ts`, `full-workflow-delivery.spec.ts`, `workflow-complet.spec.ts`. Aucun autre test ne suppose l’absence de commandes PREPARED, donc cette donnée de seed n’impacte pas le reste de la suite.

## Workflows Critiques Testés

### 1. Tests Unitaires ✅
- ✅ Génération des numéros de séquence (commandes, factures, BL)
- ✅ Calcul des prix par segment (LABO, DENTISTE, REVENDEUR)
- ✅ Calculs de TVA (HT, TTC)
- ✅ Utilitaires de facturation (totaux, restants, statuts)

### 2. Tests d'Intégration (À compléter)
- ⏳ Création de commande
- ⏳ Transitions de statut
- ⏳ Création automatique de facture
- ⏳ Traitement des paiements

### 3. Tests E2E (À compléter)
- ⏳ Authentification
- ⏳ Workflow complet de commande
- ⏳ Gestion des factures
- ⏳ Upload d'images

## Prochaines Étapes

Pour compléter les tests d'intégration, il faudra :

1. **Configurer une base de données de test**
   - Créer un fichier `.env.test` avec une DB SQLite de test
   - Créer un script de setup/teardown pour les tests

2. **Mocker l'authentification**
   - Créer des helpers pour simuler les sessions
   - Créer des utilisateurs de test

3. **Créer des fixtures de données**
   - Produits de test
   - Utilisateurs de test
   - Commandes de test

4. **Implémenter les tests d'intégration**
   - Tester les Server Actions réels
   - Vérifier les interactions avec la base de données
   - Vérifier les règles métier

## Notes

- Les tests unitaires sont fonctionnels et peuvent être exécutés immédiatement
- Les tests d'intégration nécessitent une configuration de base de données de test
- Les tests E2E nécessitent que l'application soit en cours d'exécution
