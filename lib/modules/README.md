# Modules extensibles

Ce dossier est destiné aux **modules optionnels** du mini-ERP, pour faciliter l’évolution vers un ERP complet.

## Principes

- **Un module = un domaine métier** (ex: achats, CRM, rapports)
- Chaque module peut exposer :
  - Des **actions** (Server Actions)
  - Des **routes API**
  - Des **pages** (sous `/admin`, `/comptable`, etc.)
  - Des **hooks** ou **événements** (ex: après création de facture)
- Les modules sont **découplés** du cœur (commandes, factures, stock).

## Structure suggérée (future)

```
lib/modules/
├── README.md           # ce fichier
├── purchases/          # module Achats (exemple futur)
│   ├── actions.ts
│   ├── types.ts
│   └── README.md
├── crm/                # module CRM (exemple futur)
│   └── ...
└── registry.ts         # enregistrement des modules actifs (feature flags)
```

## Activation des modules

L’activation se fait via variables d’environnement :
- `ENABLE_MODULE_PURCHASES=true` — module Achats / Fournisseurs
- `ENABLE_MODULE_CRM=true` — module CRM
- `ENABLE_MODULE_REPORTS=true` — module Rapports / BI

Voir `lib/feature-flags.ts` et `lib/modules/registry.ts`.

À terme : table `AdminSettings` pour `enabledModules` (activation dynamique).
