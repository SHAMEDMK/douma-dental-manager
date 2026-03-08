# 🤝 Points de discussion — Présentation Tactac

*Idées pour animer l’échange avec un ami développeur après la démo*

---

## 1. Choix techniques

- **Pourquoi Server Actions plutôt qu’une API REST complète ?**  
  Réduction de la surface d’exposition, moins de duplication validation client/serveur, bon fit avec les RSC. Les API restent pour login, PDF, upload, exports.

- **SQLite en dev, PostgreSQL en prod :**  
  Prisma permet de changer de provider ; les migrations sont écrites à la main (SQLite n’a pas tous les types Postgres). À clarifier : stratégie de migration des données pour le passage en prod.

- **Pas de middleware Next.js pour l’auth :**  
  Protection par `getSession()` dans chaque layout/page. Avantage : explicite et facile à débugger. Inconvénient : risque d’oubli sur une nouvelle route → à discuter (middleware unique vs. garde-fous par rôle).

- **Rate limiting en mémoire :**  
  Suffisant pour une seule instance. En multi-instances ou production : Redis ou équivalent à prévoir.

---

## 2. Qualité & tests

- **E2E sur 127.0.0.1 :**  
  Évite les problèmes de cookie entre localhost et 127.0.0.1. À mentionner si ton ami a déjà eu des flaky tests liés au domaine.

- **Couverture actuelle :**  
  Beaucoup de parcours critiques couverts (auth, produits, stock, commandes, livraison, factures, backups, audit). Quel objectif pour la prod : 90 % des parcours ? Tests de régression sur chaque release ?

- **Tests de charge :**  
  Pas encore en place. Idée : k6, Artillery ou Playwright en mode “multi-utilisateurs” pour les parcours critiques.

---

## 3. Produits & variantes

- **210 variantes pour un seul produit :**  
  Modèle normalisé (ProductOption / ProductVariant) évite 210 lignes en dur. Questions à ouvrir : pagination côté catalogue, filtres par option, performance des requêtes (include Prisma, index).

- **Résolution de variante au panier :**  
  Le client choisit Teinte/Dimension avant validation. Gestion des “variantes en attente” (pendingVariant) et validation côté serveur pour éviter les incohérences.

- **Stock par variante :**  
  StockMovement avec productVariantId, alertes minStock par variante. À discuter : alertes agrégées (produit parent) vs. par variante pour le magasinier.

---

## 4. Sécurité & conformité

- **Audit logs :**  
  Qui a fait quoi, quand, sur quelle entité (Order, Invoice, etc.). Utile pour la conformité et le support. Rétention et export des logs à définir.

- **Données sensibles :**  
  Mots de passe hashés (bcrypt), pas de stockage de carte bancaire pour l’instant. Paiement en ligne futur : déléguer à un prestataire (Stripe, etc.) et ne jamais stocker les numéros.

- **Backups :**  
  Scripts + interface admin (liste, téléchargement). Où sont stockés les backups (réseau, cloud) et politique de rétention à préciser.

---

## 5. UX & product

- **Limite de crédit :**  
  Blocage du panier si dépassement, message clair. Alternative : autoriser la commande en “en attente de validation” plutôt que blocage strict ?

- **Approbation des commandes (marge négative) :**  
  Paramétrable (AdminSettings). Intéressant à montrer comme exemple de règle métier configurable sans coder.

- **Espace livreur :**  
  Code de confirmation à la livraison. Idée d’évolution : signature électronique ou photo de preuve ?

---

## 6. Déploiement & DevOps

- **CI/CD :**  
  Pas encore de pipeline décrit (ex. GitHub Actions). À définir : lint, build, migrations, E2E sur une branche ou sur chaque PR.

- **Environnements :**  
  Dev (SQLite), staging (PostgreSQL ?), prod. Variables d’environnement (DATABASE_URL, Resend, etc.) et secrets à lister.

- **Migrations Prisma en prod :**  
  `prisma migrate deploy` dans le déploiement ; stratégie de rollback (sauvegarde avant migration, rollback manuel si besoin).

---

## 7. Ce dont tu es le plus fier (à mettre en avant)

- **Workflow complet** : de la commande au BL et à la livraison avec code de confirmation.
- **Modèle de variantes** : générique et scalable (210 combinaisons sans coder en dur).
- **Audit + backups** : traçabilité et récupération en cas de problème.
- **Tests E2E structurés** : auth-setup, projets par rôle, seed reproductible et rate limit isolé.
- **Paramétrage métier** : approbation, TVA, conditions de paiement, infos banque (RIB) sur les factures.

---

## 8. Leçons apprises (à partager)

- **Toujours fixer la même origine (127.0.0.1) en E2E** pour éviter les soucis de cookies.
- **Isoler les tests** (rate limit, seed) évite des échecs aléatoires et des nuits de debug.
- **Modéliser les variantes tôt** : refactorer après coup est plus coûteux.
- **Documenter les décisions** (MD dans le repo) aide pour la reprise et pour les discussions comme celle-ci.

---

## 9. Questions que ton ami pourrait poser

- “Pourquoi pas Remix / Nuxt / autre ?”  
  Next.js pour l’écosystème, RSC, déploiement simple (Vercel ou Node).

- “Comment vous gérez les conflits de concurrence sur les commandes ?”  
  À clarifier : verrouillage optimiste, version sur Order, ou règles métier (ex. une seule modification à la fois).

- “Qui fait la revue de code ?”  
  Selon ton contexte : solo vs. pair, checklist avant merge (lint, tests, migrations).

- “Prêt pour combien d’utilisateurs simultanés ?”  
  Honnêtement : non mesuré. Prochaine étape : tests de charge et monitoring (logs, lenteurs).

---

## 10. Suite après la présentation

- **Court terme** : envoyer le rapport complet (`RAPPORT_PROJET_TACTAC.md`) + slides (`RAPPORT_PROJET_TACTAC_SLIDES.md`) pour lecture à froid.
- **Optionnel** : session pair programming sur un des 3 tests E2E à corriger ou sur une feature (ex. variantes).
- **Idées** : revue de l’architecture auth, proposition de pipeline CI, ou brainstorm sur la roadmap produit.

---

*Ces points peuvent servir de trame pour une présentation de 20–30 min + 15 min de questions.*
