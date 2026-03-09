# Priorités – DOUMA Dental Manager

## Vue d’ensemble

Ce document liste les priorités pour faire avancer le projet, du plus urgent au plus long terme.

---

## P0 – Critique (à faire en premier)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | **Mettre à jour AGENTS.md** | Les tests d’intégration passent maintenant (1 passed, 9 skipped) | 2 min |
| 2 | **Vérifier la CI en production** | S’assurer que la branche protection + check `ci` sont actifs | 5 min |
| 3 | **Backup automatique en prod** | Voir `docs/OPERATIONS.md` – configurer cron/Task Scheduler | 30 min |

---

## P1 – Court terme (1–2 semaines)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | **Migrer `fr-FR` et `Dh` vers `lib/config`** | Extensibilité devise/locale, moins de valeurs en dur | 2–4 h |
| 2 | **Feature flags pour modules** | Activer/désactiver des modules sans redéploiement | 2–3 h |
| 3 | **Rapports CA (Compte d’exploitation)** | Le dossier `app/admin/reports/ca/` existe – finaliser si utile | 4–8 h |
| 4 | **Documenter les API** | Compléter `docs/API.md` pour les intégrations futures | 2 h |

---

## P2 – Moyen terme (1–2 mois)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | **Module Achats / Fournisseurs** | Bons de commande fournisseurs, réceptions, stock entrant | 2–3 sem |
| 2 | **Rapports / BI** | Tableaux de bord, exports avancés, KPIs | 1–2 sem |
| 3 | **CRM léger** | Relances clients, suivi commercial | 1–2 sem |
| 4 | **Réduire les 223 warnings ESLint** | Qualité de code, par lots de 20–30 | Continu |

---

## P3 – Long terme (3+ mois)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | **Multi-entrepôts** | Plusieurs dépôts, transferts inter-sites | 3–4 sem |
| 2 | **Multi-société (tenant)** | Plusieurs entités juridiques | 4–6 sem |
| 3 | **Comptabilité avancée** | Plan comptable, écritures, rapprochements | 4–6 sem |
| 4 | **i18n (arabe, anglais)** | Marchés MENA, export | 2–3 sem |

---

## Recommandation immédiate

**Cette semaine :**
1. Mettre à jour AGENTS.md (tests intégration)
2. Migrer 5–10 usages de `fr-FR` / `Dh` vers `lib/config` (ex: `formatDate`, `formatCurrencyWithSymbol`)
3. Vérifier que le backup prod est bien configuré

**Ce mois :**
1. Finaliser la migration config (devise, locale)
2. Introduire les feature flags
3. Décider du premier module à développer : Achats ou Rapports
