# Politique des données – Tactac

Ce document décrit les principes de **traitement, conservation et sécurisation des données** dans l’application Tactac (laboratoire dentaire / B2B). Il vise à clarifier les pratiques pour les utilisateurs, les partenaires (ex. comptable externe) et un éventuel audit ou cadre légal (RGPD, loi marocaine sur les données personnelles).

**Important** : ce texte est une base de documentation technique et organisationnelle. Pour une conformité juridique formelle (RGPD, loi 09-08 au Maroc, etc.), une validation par un avocat ou un DPO est recommandée.

---

## 1. Données traitées

L’application traite notamment :

- **Données d’identification** : nom, email, téléphone, adresse, ICE (clients et utilisateurs)
- **Données métier** : commandes, factures, paiements, stock, mouvements de stock
- **Données de connexion** : sessions (JWT), tentatives de connexion (rate limiting, audit)
- **Logs d’audit** : qui a fait quelle action, quand (modifications commandes, factures, paramètres, etc.)

Les données sont stockées dans une base de données (SQLite en développement, PostgreSQL en production) et, le cas échéant, dans des fichiers (backups, exports).

---

## 2. Durée de conservation

| Type de donnée | Durée recommandée | Remarque |
|----------------|-------------------|----------|
| **Données clients et commandes** | Tant que la relation commerciale existe + durée légale (comptabilité, prescription) | Adapter selon droit local (ex. 10 ans pour pièces comptables en France) |
| **Factures et paiements** | Durée légale de conservation des pièces comptables (ex. 10 ans) | Ne pas supprimer avant échéance légale |
| **Logs d’audit** | À définir (ex. 1 à 3 ans) | Permettre traçabilité en cas de litige ou contrôle |
| **Backups** | Selon politique de rétention (ex. 30 jours, ou N derniers backups) | Voir `docs/PRODUCTION_CHECKLIST.md` (Backups) |
| **Tokens de réinitialisation de mot de passe** | Usage unique, expiration courte (ex. 1 h) | Supprimés ou invalidés après utilisation |
| **Sessions** | Durée de vie du JWT (configurable) | Pas de conservation longue des tokens |

En production, il est recommandé de formaliser ces durées (par exemple dans un registre des traitements) et de prévoir des tâches ou scripts pour purger ou anonymiser les données au-delà de la durée retenue.

---

## 3. Qui voit quoi (traçabilité)

- **Rôles** : l’application distingue ADMIN, CLIENT, COMPTABLE, MAGASINIER, COMMERCIAL ; les livreurs sont des utilisateurs de type MAGASINIER (livreur). Chaque rôle n’accède qu’aux données nécessaires à sa fonction.
- **Logs d’audit** : les actions sensibles (modification de commande, validation, paiement, changement de paramètres, etc.) sont enregistrées avec l’identifiant de l’utilisateur et l’heure. Ces logs sont consultables par les administrateurs (ex. page Audit dans l’admin).
- **Export et backups** : les exports (Excel, etc.) et les backups de base sont réservés aux personnes autorisées (admin) et doivent être traités comme des données sensibles (stockage sécurisé, pas de diffusion non contrôlée).

En cas d’audit ou de demande légale, les logs d’audit permettent de savoir qui a accédé ou modifié quoi et quand.

---

## 4. Suppression client et anonymisation

- **Droit à l’effacement** : sur demande légitime (ex. droit à l’oubli), il est possible de supprimer ou d’anonymiser un compte client. Attention : les factures et pièces comptables doivent souvent être conservées au-delà de la suppression du compte (anonymisation des données personnelles tout en gardant les montants et références pour la comptabilité).
- **Implémentation actuelle** : le projet permet la suppression ou la désactivation de comptes selon les écrans admin. Pour une conformité complète, il est recommandé de :
  - Documenter la procédure interne (qui peut demander la suppression, qui l’exécute)
  - Prévoir, si besoin, une anonymisation des données personnelles dans les enregistrements conservés (nom → « Client supprimé », email / téléphone supprimés ou anonymisés)
  - Consulter un juriste pour le périmètre exact (RGPD, loi marocaine).

---

## 5. Sécurité et confidentialité

- **Accès** : authentification requise ; mots de passe hashés (bcrypt) ; pas de stockage en clair des secrets.
- **Secrets** : JWT et clés d’environnement ne sont pas commités ; utilisation de variables d’environnement et de fichiers `.env` exclus du dépôt.
- **Backups** : stockés dans un dossier dédié, avec possibilité de copie vers un support externe ; accès restreint aux personnes autorisées.
- **Communications** : en production, utilisation de HTTPS pour toutes les requêtes.

---

## 6. Cadre juridique (RGPD / Maroc)

- **RGPD** : si des données concernent des personnes dans l’UE, les principes de licéité, minimisation, limitation de la conservation et sécurité s’appliquent. Ce document et les fonctionnalités (audit, rôles, politique de conservation) constituent une base ; un registre des traitements et une analyse des bases légales (ex. contrat, intérêt légitime) sont à compléter avec un spécialiste.
- **Maroc** : la loi 09-08 relative à la protection des données personnelles impose des obligations similaires (licéité, finalité, durée, sécurité). Adapter la durée de conservation et les procédures de suppression/anonymisation selon les recommandations d’un avocat ou d’un DPO.

---

## 7. Résumé

| Thème | Position du projet |
|-------|---------------------|
| **Conservation** | Durées à formaliser (comptabilité, audit, backups) ; document à mettre à jour selon la loi applicable |
| **Traçabilité** | Logs d’audit pour savoir qui a fait quoi ; consultation réservée aux admins |
| **Suppression / anonymisation** | Procédure à documenter et à renforcer (anonymisation des données personnelles dans les pièces conservées) |
| **Sécurité** | Auth, secrets hors dépôt, backups, HTTPS en prod |

Ce document peut être fourni à un partenaire (comptable, investisseur) ou à un auditeur pour montrer que la politique des données est réfléchie. Pour une conformité juridique complète, faire valider les durées et les procédures par un professionnel du droit.
