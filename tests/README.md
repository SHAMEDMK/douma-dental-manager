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
```bash
# Lancer les tests E2E
npm run test:e2e

# Lancer avec interface UI
npm run test:e2e:ui
```

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
