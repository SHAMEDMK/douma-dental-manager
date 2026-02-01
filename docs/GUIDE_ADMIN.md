# 👨‍💼 Guide Administrateur - DOUMA Dental Manager

## Table des matières

1. [Introduction](#introduction)
2. [Configuration initiale](#configuration-initiale)
3. [Gestion des clients](#gestion-des-clients)
4. [Gestion des produits](#gestion-des-produits)
5. [Gestion des commandes](#gestion-des-commandes)
6. [Gestion des factures](#gestion-des-factures)
7. [Gestion du stock](#gestion-du-stock)
8. [Logs et sécurité](#logs-et-sécurité)
9. [Maintenance](#maintenance)

---

## Introduction

Ce guide s'adresse aux administrateurs de DOUMA Dental Manager. Il couvre toutes les fonctionnalités d'administration et les bonnes pratiques.

---

## Configuration initiale

### Première connexion

1. Connectez-vous avec les identifiants fournis :
   - Email : `admin@douma.com` (par défaut)
   - Mot de passe : (fourni par l'installation)

2. **Changez immédiatement le mot de passe** après la première connexion

### Configuration de l'entreprise

#### Informations de l'entreprise

1. Allez dans **"Paramètres"** → **"Informations entreprise"**
2. Remplissez **obligatoirement** :
   - **Raison sociale** : Nom officiel de l'entreprise
   - **Adresse** : Adresse complète
   - **Ville**
   - **Pays**
   - **ICE** : Identifiant Commun de l'Entreprise (Maroc)

3. Remplissez les informations **optionnelles** :
   - **IF** : Identifiant Fiscal
   - **RC** : Registre du Commerce
   - **TP** : Taxe Professionnelle
   - **Téléphone** : Numéro de téléphone
   - **Email** : Email de contact (utilisé pour les emails transactionnels)

4. Configurez :
   - **Taux TVA** : Par défaut 20% (modifiable)
   - **Conditions de paiement** : Texte affiché sur les factures
   - **Mentions légales** (optionnel) : Mentions TVA, retard de paiement, etc.

5. Cliquez sur **"Enregistrer"**

> ⚠️ **Important** : Ces informations apparaîtront sur toutes les factures et bons de livraison.

#### Règles d'approbation

Configurez les règles pour valider automatiquement ou manuellement les commandes :

1. Allez dans **"Paramètres"** → **"Règles d'approbation"**

2. **Demander approbation si marge de ligne négative**
   - ✅ **Activé** : Toute ligne avec marge négative nécessite validation
   - ❌ **Désactivé** : Les marges négatives sont acceptées automatiquement

3. **Demander approbation si marge en dessous de X%**
   - Activez cette option si vous voulez valider les commandes avec marge faible
   - Définissez le **seuil** (ex: 5% = marge < 5% nécessite validation)

4. **Demander approbation si marge totale négative**
   - ✅ **Activé** : Toute commande avec marge totale négative nécessite validation

5. **Bloquer workflow jusqu'à approbation**
   - ✅ **Activé** : La commande ne peut pas être préparée tant qu'elle n'est pas validée
   - ❌ **Désactivé** : La commande peut être préparée sans validation (mais reste marquée)

6. **Message d'approbation** : Texte affiché sur les commandes à valider (ex: "Commande à valider (marge anormale)")

7. Cliquez sur **"Enregistrer"**

---

## Gestion des clients

### Inviter un nouveau client

1. Allez dans **"Clients"** → **"Inviter un client"**

2. Remplissez le formulaire :
   - **Email** : Adresse email du client (obligatoire, doit être unique)
   - **Nom** : Nom complet du client (obligatoire)
   - **Raison sociale** : Nom de l'entreprise (optionnel)
   - **Segment** : LABO, DENTISTE, ou REVENDEUR (détermine les prix)
   - **Remise** : Pourcentage de remise automatique (optionnel, ex: 5 = -5%)
   - **Plafond de crédit** : Montant maximum autorisé (défaut: 5000 Dh)

3. Cliquez sur **"Envoyer l'invitation"**

4. Le client recevra un **email avec le lien d'activation**
5. Le lien est aussi affiché à l'écran (pour copie manuelle si l'email échoue)

### Gérer un client existant

#### Consulter les informations

1. Allez dans **"Clients"**
2. Cliquez sur un client
3. Vous verrez :
   - Informations personnelles
   - Historique des commandes
   - Statistiques (CA total, marge, solde actuel, plafond)

#### Modifier un client

1. Sur la page du client, cliquez sur **"Modifier"**
2. Modifiez les informations souhaitées
3. Cliquez sur **"Enregistrer"**

> ⚠️ **Attention** : Modifier le plafond de crédit affecte immédiatement le calcul du crédit disponible.

#### Réinitialiser un mot de passe client

Les clients ne peuvent pas réinitialiser leur mot de passe directement. Pour réinitialiser :

1. Supprimez le mot de passe du client (base de données)
2. Ou créez une nouvelle invitation pour le même email

---

## Gestion des produits

### Ajouter un produit

1. Allez dans **"Produits"** → **"Nouveau produit"**

2. Remplissez le formulaire :

   **Informations de base :**
   - **Nom** : Nom du produit (obligatoire)
   - **Description** : Description détaillée (optionnel)

   **Prix par segment :**
   - **Prix LABO** : Prix pour les laboratoires (obligatoire)
   - **Prix DENTISTE** : Prix pour les dentistes (optionnel)
   - **Prix REVENDEUR** : Prix pour les revendeurs (optionnel)

   > 💡 **Note** : Si un prix segment n'est pas défini, le prix LABO sera utilisé.

   **Coût et marge :**
   - **Coût** : Coût d'achat du produit (pour calcul de marge)
   - Si le coût est 0, la marge ne peut pas être calculée

   **Stock :**
   - **Stock initial** : Quantité en stock (défaut: 0)
   - **Stock minimum** : Seuil d'alerte (défaut: 5)

   **Autres :**
   - **Catégorie** : Catégorie du produit (optionnel)
   - **Image** : Upload ou URL de l'image (optionnel)

3. Cliquez sur **"Créer"**

### Upload d'image

#### Méthode 1 : Upload de fichier

1. Cliquez sur **"Parcourir"**
2. Sélectionnez une image (JPG, PNG, max 5MB)
3. Cliquez sur **"Uploader"**
4. L'image est téléchargée dans `public/uploads/products/`
5. L'URL est remplie automatiquement

#### Méthode 2 : URL manuelle

1. Entrez une URL valide :
   - URL complète : `https://example.com/image.jpg`
   - URL relative : `/uploads/products/image.jpg`

2. ⚠️ **Les chemins Windows** (`C:\...`) ne sont **pas acceptés**

### Modifier un produit

1. Allez dans **"Produits"**
2. Cliquez sur un produit
3. Cliquez sur **"Modifier"**
4. Modifiez les informations souhaitées
5. Cliquez sur **"Mettre à jour"**

> ⚠️ **Attention** : Modifier le prix d'un produit n'affecte pas les commandes existantes. Les prix sont "capturés" au moment de la commande.

### Gérer le stock

Voir section [Gestion du stock](#gestion-du-stock).

---

## Gestion des commandes

### Liste des commandes

Dans **"Commandes"**, vous verrez toutes les commandes avec :
- Numéro de commande
- Client
- Date
- Total TTC
- Statut
- Statut de la facture
- Disponibilité du bon de livraison
- Actions disponibles

### Workflow des commandes

#### 1. Commande Confirmée

**Action du client :**
- Client valide son panier
- Commande créée avec statut "CONFIRMED"
- Client reçoit un email de confirmation

**Votre action :**
- Consulter la commande
- Vérifier si elle nécessite validation (badge orange)
- Valider si nécessaire

#### 2. Commande Préparée

**Action :**
1. Cliquez sur **"Préparer"** (ou sélectionnez "Préparée" dans le menu)
2. Le bon de livraison est généré automatiquement (format `BL-YYYYMMDD-####`)
3. Le client reçoit un email de notification

**Bon de livraison :**
- Numéro généré : même séquence que la commande (ex: CMD-20260114-0029 → BL-20260114-0029)
- Disponible pour consultation/impression
- PDF téléchargeable

#### 3. Commande Expédiée

**Action :**
1. Cliquez sur **"Expédier"** (ou sélectionnez "Expédiée")
2. Le client reçoit un email de notification

**Informations de livraison (optionnel) :**
- Vous pouvez ajouter des informations de livraison :
  - Ville
  - Adresse
  - Téléphone
  - Agent de livraison
  - Date d'expédition

#### 4. Commande Livrée

**Action :**
1. Cliquez sur **"Livrer"** (ou sélectionnez "Livrée")
2. La **facture est générée automatiquement** (format `FAC-YYYYMMDD-####`)
3. Le client reçoit un email avec la facture

**Facture :**
- Numéro généré séquentiellement
- Montant = Total de la commande
- Statut initial : "UNPAID"
- PDF téléchargeable

### Annuler une commande

Vous pouvez annuler une commande si :
- La facture n'est pas encore payée
- Le statut n'est pas "DELIVERED" ou "CANCELLED"

**Action :**
1. Cliquez sur **"Annuler"**
2. Le stock est libéré automatiquement
- Le solde du client est ajusté

> ⚠️ **Important** : Une commande payée ne peut pas être annulée.

### Valider une commande (marge anormale)

Si une commande a une marge négative ou inférieure au seuil :

1. Un badge orange **"À valider (marge anormale)"** apparaît
2. Cliquez sur **"Valider"** pour approuver
3. La commande peut ensuite être préparée normalement

### Modifier une commande

Vous pouvez modifier une commande si :
- Le statut est "CONFIRMED"
- La facture n'existe pas encore
- La facture existe mais n'est pas verrouillée

**Action :**
1. Cliquez sur **"Voir détails"** de la commande
2. Cliquez sur **"Modifier"**
3. Ajoutez ou supprimez des produits
4. Modifiez les quantités
5. Cliquez sur **"Enregistrer"**

> ⚠️ **Attention** : Modifier une commande modifie le total et peut affecter la facture si elle existe.

---

## Gestion des factures

### Liste des factures

Dans **"Factures"**, les factures sont organisées :
- **En haut** : Factures impayées/partielles (priorité)
- **Tableau** : Toutes les factures avec statut

### Enregistrer un paiement

#### Paiement complet

1. Cliquez sur une facture impayée
2. Cliquez sur **"Encaisser"**
3. Le montant est pré-rempli avec le solde restant
4. Sélectionnez la méthode :
   - **Espèces** : Paiement en cash
   - **Chèque** : Paiement par chèque
   - **Virement** : Paiement par virement bancaire
5. Ajoutez une **référence** (numéro de chèque, virement, etc.) - optionnel
6. Cliquez sur **"Confirmer"**

**Résultat :**
- La facture devient **"Payée"** automatiquement
- L'ordre passe en **"Livrée"** (si pas déjà)
- Le solde du client est diminué

#### Paiement partiel

1. Cliquez sur une facture impayée
2. Cliquez sur **"Encaisser"**
3. **Modifiez le montant** pour payer moins que le solde
4. Sélectionnez la méthode et ajoutez la référence
5. Cliquez sur **"Confirmer"**

**Résultat :**
- La facture devient **"Partiellement payée"**
- Le solde restant est affiché
- Vous pouvez enregistrer d'autres paiements pour compléter

#### Vérifications automatiques

- ✅ Le montant ne peut pas dépasser le solde restant
- ✅ Le montant doit être positif
- ✅ La facture ne peut pas être modifiée si "Payée"

### Consulter l'historique des paiements

Sur la page de détail d'une facture, vous verrez :
- **Tableau des paiements** :
  - Date et heure
  - Montant (en vert, gras)
  - Méthode (traduite : Espèces, Chèque, Virement)
  - Référence (ou "-" si vide)
- **Total payé** : Somme de tous les paiements (en bas du tableau)

### Modifier un paiement

1. Cliquez sur une facture partiellement payée
2. Trouvez le paiement dans l'historique
3. Utilisez l'API ou la base de données pour modifier

> ⚠️ **Important** : Les paiements d'une facture "Payée" ne peuvent pas être modifiés ou supprimés.

### Supprimer un paiement

1. Cliquez sur une facture partiellement payée
2. Utilisez l'API `DELETE /api/admin/payment/[id]`
3. La facture sera recalculée automatiquement

> ⚠️ **Attention** : Impossible de supprimer un paiement si la facture est "Payée".

---

## Gestion du stock

### Consulter le stock

Dans **"Stock"**, vous verrez tous les produits avec :
- Stock actuel
- Stock minimum
- État :
  - ✅ **OK** : Stock > stock minimum
  - ⚠️ **Stock bas** : Stock ≤ stock minimum
  - 🔴 **Rupture** : Stock = 0

### Ajuster le stock

#### Ajouter du stock

1. Cliquez sur un produit
2. Cliquez sur **"Ajuster le stock"**
3. Sélectionnez **"Ajouter"**
4. Entrez la quantité
5. Ajoutez une raison (ex: "Réception marchandise")
6. Cliquez sur **"Confirmer"**

#### Retirer du stock

1. Cliquez sur un produit
2. Cliquez sur **"Ajuster le stock"**
3. Sélectionnez **"Retirer"**
4. Entrez la quantité
5. Ajoutez une raison (ex: "Perte, casse")
6. Cliquez sur **"Confirmer"**

#### Inventaire (Ajustement exact)

1. Cliquez sur un produit
2. Cliquez sur **"Ajuster le stock"**
3. Sélectionnez **"Inventaire"**
4. Entrez le stock exact (le système calcule la différence)
5. Ajoutez une raison (ex: "Inventaire physique")
6. Cliquez sur **"Confirmer"**

### Mouvements de stock

#### Types de mouvements

- **IN** : Entrée de stock (ajout, réception)
- **OUT** : Sortie de stock (retrait, perte)
- **ADJUSTMENT** : Ajustement (inventaire)

#### Automatique vs Manuel

**Automatiques :**
- Sortie lors de création de commande
- Entrée lors d'annulation de commande

**Manuels :**
- Ajustements depuis l'interface admin

### Alertes de stock

Les produits avec stock ≤ stock minimum apparaissent :
- En **orange** dans la liste du stock
- Avec un badge **"Stock bas"**

> 💡 **Conseil** : Consultez régulièrement le stock pour éviter les ruptures.

---

## Logs et sécurité

### Logs d'audit

#### Consulter les logs

1. Allez dans **"Logs d'audit"**
2. Vous verrez toutes les actions importantes :
   - **Date/Heure** : Quand l'action a eu lieu
   - **Action** : Type d'action (badge coloré)
   - **Type** : Type d'entité concernée
   - **Utilisateur** : Email et rôle
   - **Détails** : Informations JSON (cliquable)

#### Actions auditées

- Création/modification de commandes
- Changements de statut
- Création de factures
- Enregistrement/suppression de paiements
- Création/modification de produits
- Ajustements de stock
- Connexions (succès/échec)
- Modifications de paramètres

#### Utilisation

- **Traçabilité** : Voir qui a fait quoi et quand
- **Sécurité** : Détecter des actions suspectes
- **Debugging** : Résoudre des problèmes
- **Audit** : Conformité légale

### Backups

#### Consulter les backups

1. Allez dans **"Backups"**
2. Vous verrez :
   - **Total backups** : Nombre de backups
   - **Taille totale** : Espace utilisé
   - Liste des backups avec :
     - Nom du fichier
     - Type (SQLite/PostgreSQL)
     - Date de création
     - Taille
     - Actions (supprimer)

#### Créer un backup manuel

1. Cliquez sur **"Créer un backup manuel"**
2. Attendez la confirmation
3. Le backup apparaîtra dans la liste

#### Backups automatiques

Les backups automatiques sont configurés via :
- **Linux/macOS** : Cron
- **Windows** : Task Scheduler

Voir `BACKUP_IMPLEMENTATION.md` pour les instructions détaillées.

#### Restauration

Pour restaurer un backup :
- **SQLite** : Copier le fichier `.db` vers `dev.db`
- **PostgreSQL** : Utiliser `pg_restore` ou `psql`

> ⚠️ **Important** : Testez régulièrement les restaurations pour garantir leur fonctionnement.

---

## Maintenance

### Vérifications régulières

#### Quotidien
- ✅ Vérifier les commandes en attente
- ✅ Traiter les commandes préparées → expédiées
- ✅ Enregistrer les paiements
- ✅ Vérifier les stocks bas

#### Hebdomadaire
- ✅ Valider les commandes avec marge anormale
- ✅ Vérifier les factures impayées
- ✅ Consulter les logs d'audit

#### Mensuel
- ✅ Vérifier les backups
- ✅ Tester une restauration
- ✅ Consulter les statistiques (dashboard)
- ✅ Nettoyer les anciens backups

### Bonnes pratiques

1. **Sécurité**
   - Changer les mots de passe régulièrement
   - Utiliser des mots de passe forts
   - Ne pas partager les comptes admin
   - Consulter les logs d'audit régulièrement

2. **Backups**
   - Créer des backups réguliers
   - Tester les restaurations
   - Stocker les backups hors-site

3. **Stock**
   - Maintenir des stocks suffisants
   - Configurer les stocks minimum appropriés
   - Ajuster le stock après inventaire

4. **Commandes**
   - Traiter les commandes rapidement
   - Valider les commandes avec marge anormale
   - Enregistrer les paiements promptement

5. **Clients**
   - Vérifier les plafonds de crédit
   - Suivre les impayés
   - Communiquer avec les clients si nécessaire

---

## Dépannage

### Problèmes courants

#### Les emails ne sont pas envoyés

1. Vérifiez la configuration `RESEND_API_KEY` dans `.env`
2. Vérifiez que `CompanySettings.email` est configuré
3. Consultez les logs de l'application

#### Les backups ne se créent pas automatiquement

1. Vérifiez que la tâche planifiée (cron/Task Scheduler) est configurée
2. Vérifiez les permissions du dossier `backups/`
3. Consultez les logs de la tâche planifiée

#### Un produit n'apparaît pas dans le catalogue

1. Vérifiez que le stock > 0 (si configuré)
2. Vérifiez que le produit n'est pas désactivé
3. Vérifiez la catégorie/segment

#### Les prix ne correspondent pas

1. Vérifiez le segment du client
2. Vérifiez les prix par segment du produit
3. Vérifiez la remise du client

---

**Dernière mise à jour** : Janvier 2025
