# Roadmap ERP – DOUMA Dental Manager

## Vision

DOUMA Dental Manager est un **mini-ERP dentaire** conçu pour être **extensible** et évoluer vers un ERP complet. L’architecture vise à faciliter l’ajout de modules, la personnalisation et l’intégration.

---

## État actuel (Mini-ERP)

| Module | Fonctionnalités | Statut |
|--------|-----------------|--------|
| **Commercial** | Commandes, devis, clients, catalogue | ✅ |
| **Facturation** | Factures, paiements partiels, COD | ✅ |
| **Stock** | Mouvements, alertes, inventaire | ✅ |
| **Livraison** | Bons de livraison, confirmation | ✅ |
| **Comptabilité** | Clôture comptable, verrouillage | ✅ |
| **Portail client** | Catalogue, commandes, favoris | ✅ |
| **Rôles** | Admin, Comptable, Magasinier, Commercial, Livreur, Client | ✅ |

---

## Axes d’extension (vers ERP complet)

### 1. Configuration centralisée
- **Devise** : Dh (actuel) → configurable (EUR, USD, MAD…)
- **Locale** : fr-FR (actuel) → configurable (ar-MA, en-US…)
- **Segments clients** : LABO, DENTISTE, REVENDEUR → extensibles
- **Entreprise** : nom, logo, adresse → CompanySettings (existant)

### 2. Modules futurs (priorisation à définir)
- **Achats / Fournisseurs** : bons de commande, réceptions
- **Comptabilité avancée** : plan comptable, écritures, rapprochements
- **CRM** : suivi commercial, relances
- **Rapports / BI** : tableaux de bord, exports avancés
- **Multi-entrepôts** : plusieurs dépôts, transferts
- **Multi-société** : plusieurs entités juridiques (tenant)
- **Workflow** : validation multi-niveaux, délégations

### 3. Extensibilité technique
- **`lib/config/`** : configuration centralisée (devise, locale, segments)
- **`lib/modules/`** : structure pour modules optionnels
- **Feature flags** : activation/désactivation de modules
- **API stable** : routes et actions prévues pour intégrations externes

### 4. Données et schéma
- **Prisma** : migrations incrémentales, pas de breaking changes
- **Audit** : traçabilité des modifications (existant)
- **Backup** : sauvegardes automatiques (existant)

---

## Principes d’extensibilité

1. **Configuration > code** : préférer des paramètres (config, DB) aux valeurs en dur.
2. **Modules découplés** : chaque module a une responsabilité claire.
3. **Rétrocompatibilité** : les évolutions ne cassent pas les données existantes.
4. **Documentation** : chaque nouveau module est documenté dans `docs/`.

---

## Prochaines étapes (ordre suggéré)

1. ✅ Centraliser devise, locale et segments dans `lib/config/`
2. ✅ Documenter la structure des modules dans `lib/modules/`
3. ✅ Migrer progressivement les usages de `fr-FR`, `Dh`, etc. vers la config
4. ✅ Introduire des feature flags pour les modules optionnels (`lib/feature-flags.ts`, `lib/modules/registry.ts`)
5. Planifier le module Achats/Fournisseurs (schéma, actions, UI)
