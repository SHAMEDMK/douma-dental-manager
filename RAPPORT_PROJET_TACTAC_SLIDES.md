# 🎯 Tactac — Présentation synthétique (10 slides)

*Plateforme e-commerce B2B pour dentistes — démo rapide*

---

## Slide 1 — Titre & contexte
**Tactac (Douma Dental Manager)**  
Plateforme B2B matériel dentaire • Multi-rôles • Workflow commande → livraison → facturation

- **Stack** : Next.js 16, React 19, TypeScript, Prisma (SQLite/PostgreSQL), Tailwind, Playwright
- **Public** : Cabinets dentaires, labos, distributeurs
- **État** : En développement actif, cœur métier stable

---

## Slide 2 — Rôles & espaces
| Rôle | Espace | Principales actions |
|------|--------|----------------------|
| **ADMIN** | `/admin` | Dashboard, clients, produits, commandes, factures, stock, paramètres, audit, backups |
| **CLIENT** | `/portal` | Catalogue, panier, commandes, factures, favoris, demande de contact |
| **COMPTABLE** | `/comptable` | Factures, paiements, commandes, exports Excel/CSV |
| **MAGASINIER** | `/magasinier` | Préparation commandes, stock, mouvements |
| **LIVREUR** | `/delivery` | Tournée, confirmation livraison avec code |

Authentification par session (cookie HttpOnly), rate limiting, invitations clients, reset password.

---

## Slide 3 — Workflow de commande
```
Panier (crédit vérifié) → Commande CONFIRMED
  → Approbation admin si marge négative (paramétrable)
  → PREPARED (génération BL)
  → SHIPPED (livreur assigné, code de confirmation)
  → DELIVERED (confirmation par le livreur)
Facture créée à la commande • Paiements partiels/complets • Verrouillage facture
```

Limite de crédit par client, TVA et remises par segment (LABO, DENTISTE, REVENDEUR).

---

## Slide 4 — Produits & variantes
- **CRUD** produits, catégories, prix par segment, upload d’images, favoris.
- **Variantes** : modèle ProductOption (ex. Variété, Teinte, Dimension) → ProductVariant (SKU, stock, prix).
- Exemple : **Zircone** = 6×5×7 = **210 variantes** gérées (stock et prix par SKU).
- Génération en masse des variantes depuis les options ; résolution au panier/commande.

---

## Slide 5 — Stock & traçabilité
- Stock **produit** et **par variante**, seuils de réappro (minStock).
- **Mouvements** : IN, OUT, RESERVED, ADJUSTMENT avec référence et auteur.
- Ajustements manuels avec justificatif.
- **AuditLog** : actions sur commandes, factures, paiements, produits, connexions (action, entityType, entityId, userId, details, IP, userAgent).

---

## Slide 6 — Facturation & PDF
- Factures avec **TVA** (taux configurable), **montant en lettres**, conditions de paiement, **nom de banque et RIB** (CompanySettings).
- Paiements : CASH, CHECK, TRANSFER, COD.
- **Verrouillage** des factures après paiement (évite les modifications).
- **PDF** : factures et bons de livraison (admin, portail, comptable) via API dédiées.

---

## Slide 7 — Architecture en bref
- **Next.js 16** App Router, **Server Actions** pour les mutations.
- **Prisma** : 24 modèles (User, Product, Order, Invoice, StockMovement, AuditLog, variantes, etc.).
- **Sécurité** : getSession() par page/layout, rate limiting (login, API admin/PDF), seed E2E isolé (X-Rate-Limit-Test-Id).
- **Tests** : Playwright E2E (auth-setup → admin / client / no-auth), Vitest pour la lib.

---

## Slide 8 — Défis relevés
1. **Auth E2E** : baseURL 127.0.0.1 + route API login avec redirect 303 → cookies stables.
2. **Rate limiting** : header X-Rate-Limit-Test-Id pour isoler les tests.
3. **Seed reproductible** : E2E_SEED=1 + cross-env pour mêmes utilisateurs en test.
4. **Variantes à grande échelle** : modèle Option/Variant + génération en masse + résolution au panier.

---

## Slide 9 — Roadmap prochaines semaines
- **Semaine 1** : Corriger les derniers tests E2E, couverture variantes, viser ~90 % sur parcours critiques.
- **Semaine 2** : UX variantes (catalogue, panier), stock par variante.
- **Semaine 3** : Perf (requêtes Prisma, cache), 200+ variantes.
- **Semaine 4** : Staging, doc utilisateur, tests de charge.

---

## Slide 10 — Résumé & suite
- **Fonctionnel** : auth, rôles, commandes, livraison, facturation, stock, variantes, audit, backups.
- **Technique** : stack récente (Next 16, React 19), Prisma propre, E2E structurés.
- **Prochaines étapes** : finalisation tests, optimisation variantes, staging puis production.

**Questions / échanges bienvenus.**

---

*Document : RAPPORT_PROJET_TACTAC_SLIDES.md — à utiliser comme support pour une démo de 10–15 min.*
