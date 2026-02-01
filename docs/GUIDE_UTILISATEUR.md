# 📚 Guide Utilisateur - DOUMA Dental Manager

## Table des matières

1. [Introduction](#introduction)
2. [Connexion](#connexion)
3. [Portail Client](#portail-client)
4. [Espace Admin](#espace-admin)
5. [FAQ](#faq)

---

## Introduction

**DOUMA Dental Manager** est une application de gestion professionnelle pour cabinets dentaires et laboratoires. Elle permet de gérer :

- 📦 Catalogue de produits
- 🛒 Commandes en ligne
- 📄 Factures et bons de livraison
- 💰 Paiements
- 📊 Stocks
- 👥 Clients

---

## Connexion

### Accès à l'application

1. Ouvrez votre navigateur et accédez à l'URL fournie par votre administrateur
2. Cliquez sur "Espace Client" ou "Connexion"
3. Entrez vos identifiants :
   - **Email** : Votre adresse email
   - **Mot de passe** : Votre mot de passe
4. Cliquez sur "Se connecter"

### Première connexion

Si c'est votre première connexion :

1. Vous recevrez un email d'invitation de votre administrateur
2. Cliquez sur le lien d'activation dans l'email
3. Créez votre mot de passe
4. Connectez-vous avec votre email et le nouveau mot de passe

---

## Portail Client

Le portail client vous permet de passer des commandes, consulter vos factures et suivre vos commandes.

### Catalogue de produits

#### Naviguer dans le catalogue

1. Accédez au **Catalogue** depuis le menu principal
2. Parcourez les produits disponibles
3. Utilisez la **barre de recherche** pour trouver un produit spécifique
4. Utilisez la **pagination** pour voir plus de produits

#### Informations affichées

Pour chaque produit, vous verrez :
- 📷 **Image du produit** (si disponible)
- 📝 **Nom du produit**
- 💰 **Prix TTC** (Toutes Taxes Comprises) en **Dh TTC**
- 📦 **Stock disponible** (si visible)

#### Ajouter un produit au panier

1. Trouvez le produit souhaité
2. Cliquez sur le produit pour voir les détails
3. Sélectionnez la **quantité** souhaitée
4. Cliquez sur **"Ajouter au panier"**
5. Le produit est ajouté et un badge apparaît sur l'icône panier

### Panier

#### Consulter votre panier

1. Cliquez sur l'**icône panier** en haut à droite
2. Vous verrez tous les produits ajoutés

#### Modifier le panier

- **Changer la quantité** : Modifiez le nombre dans le champ quantité
- **Retirer un produit** : Cliquez sur le bouton "Supprimer"

#### Informations affichées

Dans le panier, vous verrez :
- **Produit** : Nom et image
- **Prix unitaire TTC** : En Dh TTC
- **Quantité** : Nombre d'unités
- **Total ligne** : Prix unitaire × quantité en Dh TTC
- **Total panier** : Somme de toutes les lignes en Dh TTC

#### Plafond de crédit

Si vous avez un plafond de crédit configuré :
- **Plafond** : Montant maximum autorisé
- **Solde actuel** : Montant déjà utilisé
- **Disponible** : Montant restant disponible
- **Panier** : Montant de votre panier actuel

Si le montant du panier dépasse votre disponible, vous verrez un message d'erreur et ne pourrez pas valider la commande.

#### Valider une commande

1. Vérifiez tous les produits dans le panier
2. Vérifiez que le total ne dépasse pas votre crédit disponible (si applicable)
3. Cliquez sur **"Valider la commande"**
4. Votre commande est créée et vous recevez un **email de confirmation**

> ⚠️ **Important** : Après validation, votre commande doit être approuvée par un administrateur avant d'être préparée.

### Mes commandes

#### Consulter vos commandes

1. Cliquez sur **"Mes commandes"** dans le menu
2. Vous verrez toutes vos commandes avec :
   - **Numéro de commande** : Format `CMD-YYYYMMDD-####`
   - **Date** : Date de création
   - **Total TTC** : Montant total en Dh TTC
   - **Statut** : État actuel de la commande

#### Statuts des commandes

- 🔵 **Confirmée** : Commande créée, en attente d'approbation
- 🟠 **À valider** : Commande nécessitant une validation admin (marge négative)
- 🟡 **Préparée** : Commande en cours de préparation
- 🟣 **Expédiée** : Commande expédiée
- 🟢 **Livrée** : Commande livrée
- 🔴 **Annulée** : Commande annulée

#### Modifier une commande

Vous pouvez modifier une commande uniquement si :
- Le statut est **"Confirmée"**
- La commande n'a pas encore été approuvée par l'admin

Pour modifier :
1. Cliquez sur **"Modifier"** à côté de la commande
2. Ajoutez ou supprimez des produits
3. Modifiez les quantités
4. Cliquez sur **"Enregistrer"**

#### Consulter les détails d'une commande

1. Cliquez sur **"Voir détails"** à côté d'une commande
2. Vous verrez :
   - Détails complets de la commande
   - Liste des produits avec quantités et prix
   - Bon de livraison (si disponible)
   - Facture (si livrée)

#### Bon de livraison (BL)

Une fois que votre commande est **"Préparée"**, le bon de livraison est disponible :

1. Cliquez sur **"Voir détails"** de votre commande
2. Vous verrez le **numéro du BL** (format `BL-YYYYMMDD-####`)
3. Cliquez sur **"Voir/Imprimer BL"** pour voir le bon de livraison
4. Cliquez sur **"Télécharger PDF"** pour télécharger le BL en PDF

#### Facture

Une fois que votre commande est **"Livrée"**, la facture est disponible :

1. Cliquez sur **"Voir détails"** de votre commande
2. Vous verrez le **numéro de facture** (format `FAC-YYYYMMDD-####`)
3. Cliquez sur **"Voir/Imprimer facture"** pour voir la facture
4. Cliquez sur **"Télécharger PDF"** pour télécharger la facture en PDF

### Mes factures

#### Consulter vos factures

1. Cliquez sur **"Mes factures"** dans le menu
2. Vous verrez toutes vos factures avec :
   - **Numéro de facture** : Format `FAC-YYYYMMDD-####`
   - **Commande associée** : Numéro de la commande
   - **Date** : Date de création
   - **Montant TTC** : Montant total en Dh TTC
   - **Statut** : Payée, Partiellement payée, ou Impayée

#### Statuts des factures

- 🔴 **Impayée** : Aucun paiement enregistré
- 🟡 **Partiellement payée** : Paiement partiel effectué
- 🟢 **Payée** : Facture totalement payée

#### Consulter une facture

1. Cliquez sur une facture dans la liste
2. Vous verrez :
   - Détails complets de la facture
   - Liste des produits avec prix HT et TTC
   - Montant HT, TVA, et TTC
   - Historique des paiements (si applicable)
   - Solde restant (si impayée ou partielle)

#### Télécharger une facture

1. Sur la page de détail de la facture
2. Cliquez sur **"Télécharger PDF"**
3. Le fichier PDF est téléchargé automatiquement

---

## Espace Admin

> ⚠️ **Réservé aux administrateurs**

### Dashboard

Le tableau de bord affiche :
- 📊 **Chiffre d'affaires** (CA) sur la période sélectionnée
- 💰 **Marge** calculée
- 🔴 **Impayés** totaux
- 📦 **Nombre de commandes**

#### Filtres temporels

- **Aujourd'hui** : Données du jour
- **7 derniers jours** : Données de la semaine
- **30 derniers jours** : Données du mois
- **Mois actuel** : Données du mois en cours

#### Top clients

Liste des 10 meilleurs clients avec :
- CA total
- Marge
- Solde actuel
- Plafond de crédit

#### Top produits

Liste des 10 produits les plus vendus avec :
- Quantité vendue
- Marge totale

### Gestion des clients

#### Ajouter un nouveau client

1. Allez dans **"Clients"** → **"Inviter un client"**
2. Remplissez le formulaire :
   - **Email** : Adresse email du client
   - **Nom** : Nom complet
   - **Raison sociale** (optionnel)
   - **Segment** : LABO, DENTISTE, ou REVENDEUR
   - **Remise** (optionnel) : Pourcentage de remise
   - **Plafond de crédit** : Montant maximum autorisé
3. Cliquez sur **"Envoyer l'invitation"**
4. Le client recevra un email avec le lien d'activation

#### Consulter un client

1. Allez dans **"Clients"**
2. Cliquez sur un client dans la liste
3. Vous verrez :
   - Informations du client
   - Historique des commandes
   - Statistiques (CA, marge, solde)

### Gestion des produits

#### Ajouter un produit

1. Allez dans **"Produits"** → **"Nouveau produit"**
2. Remplissez le formulaire :
   - **Nom** : Nom du produit (obligatoire)
   - **Description** (optionnel)
   - **Prix LABO** : Prix pour les laboratoires
   - **Prix DENTISTE** (optionnel) : Prix pour les dentistes
   - **Prix REVENDEUR** (optionnel) : Prix pour les revendeurs
   - **Coût** : Coût d'achat (pour calcul de marge)
   - **Stock initial** : Quantité en stock
   - **Stock minimum** : Alerte si stock descend en dessous
   - **Catégorie** (optionnel)
   - **Image** : Upload d'une image ou URL
3. Cliquez sur **"Créer"**

#### Modifier un produit

1. Allez dans **"Produits"**
2. Cliquez sur un produit
3. Cliquez sur **"Modifier"**
4. Modifiez les informations souhaitées
5. Cliquez sur **"Mettre à jour"**

#### Upload d'image de produit

**Option 1 : Upload de fichier**
1. Cliquez sur **"Parcourir"**
2. Sélectionnez une image (JPG, PNG)
3. Cliquez sur **"Uploader"**
4. L'image sera téléchargée et l'URL sera remplie automatiquement

**Option 2 : URL manuelle**
1. Entrez une URL d'image valide (http://, https://, ou /uploads/...)
2. Les chemins Windows (C:\...) ne sont pas acceptés

### Gestion des commandes

#### Liste des commandes

Dans **"Commandes"**, vous verrez :
- **Numéro de commande**
- **Client**
- **Date**
- **Total TTC**
- **Statut**
- **Statut facture** (Payée, Partielle, Impayée)
- **Bon de livraison** (si disponible)
- **Actions** disponibles

#### Actions sur une commande

Selon le statut, vous pouvez :
- **Préparer** : Passer de "Confirmée" à "Préparée" (génère le BL)
- **Expédier** : Passer de "Préparée" à "Expédiée"
- **Livrer** : Passer de "Expédiée" à "Livrée" (génère la facture)
- **Annuler** : Annuler une commande non livrée (libère le stock)

#### Approuver une commande

Si une commande a une marge négative :
1. Un badge orange **"À valider (marge anormale)"** apparaît
2. Cliquez sur **"Valider"** pour approuver la commande
3. La commande peut ensuite être préparée normalement

#### Modifier une commande

Vous pouvez modifier une commande si :
- Le statut est **"Confirmée"**
- La facture n'existe pas encore

### Gestion des factures

#### Liste des factures

Dans **"Factures"**, vous verrez :
- Les factures impayées/partielles en haut (priorité)
- Toutes les factures dans le tableau

#### Enregistrer un paiement

1. Cliquez sur une facture
2. Cliquez sur **"Encaisser"**
3. Remplissez le formulaire :
   - **Montant** : Montant à encaisser (max: solde restant)
   - **Méthode** : Espèces, Chèque, ou Virement
   - **Référence** (optionnel) : Numéro de chèque, virement, etc.
4. Cliquez sur **"Confirmer"**

> ⚠️ **Important** : Si le montant correspond exactement au solde, la facture devient "Payée" automatiquement.

#### Historique des paiements

Sur la page de détail d'une facture, vous verrez :
- Liste de tous les paiements effectués
- Date et heure
- Montant
- Méthode
- Référence
- **Total payé** : Somme de tous les paiements

### Gestion du stock

#### Consulter le stock

1. Allez dans **"Stock"**
2. Vous verrez tous les produits avec :
   - Stock actuel
   - Stock minimum
   - État (✅ OK, ⚠️ Stock bas, 🔴 Rupture)

#### Ajuster le stock

1. Cliquez sur un produit
2. Cliquez sur **"Ajuster le stock"**
3. Choisissez l'opération :
   - **Ajouter** : Augmenter le stock
   - **Retirer** : Diminuer le stock
   - **Inventaire** : Définir le stock exact
4. Entrez la quantité
5. Ajoutez une raison
6. Cliquez sur **"Confirmer"**

#### Mouvements de stock

Sur la page d'un produit, vous verrez :
- **Historique des mouvements** : Tous les ajustements
- **Type** : IN (entrée), OUT (sortie), ADJUSTMENT (inventaire)
- **Quantité**
- **Référence** : Raison ou commande associée
- **Date** : Date du mouvement

### Logs d'audit

#### Consulter les logs

1. Allez dans **"Logs d'audit"**
2. Vous verrez toutes les actions importantes :
   - **Date/Heure** : Quand l'action a eu lieu
   - **Action** : Type d'action (Commande créée, Paiement enregistré, etc.)
   - **Type** : Type d'entité concernée
   - **Utilisateur** : Qui a effectué l'action
   - **Détails** : Informations supplémentaires (cliquable)

#### Filtrer les logs

- Les logs sont triés par date (plus récents en premier)
- Utilisez la pagination pour naviguer

### Backups

#### Consulter les backups

1. Allez dans **"Backups"**
2. Vous verrez :
   - **Total backups** : Nombre de backups
   - **Taille totale** : Espace utilisé
   - Liste de tous les backups avec date, taille, type

#### Créer un backup manuel

1. Cliquez sur **"Créer un backup manuel"**
2. Attendez la confirmation
3. Le backup apparaîtra dans la liste

#### Supprimer un backup

1. Cliquez sur l'icône **poubelle** à côté d'un backup
2. Confirmez la suppression

> ⚠️ **Important** : Les backups sont automatiquement créés selon la planification configurée (voir section Technique).

### Paramètres

#### Paramètres de l'entreprise

1. Allez dans **"Paramètres"** → **"Informations entreprise"**
2. Remplissez les informations :
   - **Raison sociale** (obligatoire)
   - **Adresse** (obligatoire)
   - **Ville** (obligatoire)
   - **Pays** (obligatoire)
   - **ICE** (obligatoire)
   - **IF, RC, TP** (optionnels)
   - **Téléphone** (optionnel)
   - **Email** (optionnel)
   - **Taux TVA** : Par défaut 20%
   - **Conditions de paiement** : Texte affiché sur les factures
3. Cliquez sur **"Enregistrer"**

#### Paramètres d'approbation

1. Allez dans **"Paramètres"** → **"Règles d'approbation"**
2. Configurez les règles :
   - **Demander approbation si marge de ligne négative** : Oui/Non
   - **Demander approbation si marge en dessous de X%** : Oui/Non avec seuil
   - **Demander approbation si marge totale négative** : Oui/Non
   - **Bloquer workflow jusqu'à approbation** : Oui/Non
   - **Message d'approbation** : Texte affiché sur les commandes à valider
3. Cliquez sur **"Enregistrer"**

---

## FAQ

### Questions générales

#### Comment réinitialiser mon mot de passe ?

Contactez votre administrateur pour réinitialiser votre mot de passe.

#### Je ne reçois pas les emails

Vérifiez :
- Votre dossier spam/courrier indésirable
- Que votre email est correct dans votre profil
- Contactez votre administrateur si le problème persiste

#### Les prix affichés sont-ils HT ou TTC ?

Tous les prix affichés dans le catalogue et le panier sont en **TTC (Toutes Taxes Comprises)** avec la devise **Dh TTC**.

### Commandes

#### Comment annuler une commande ?

Les clients ne peuvent pas annuler directement une commande. Contactez votre administrateur pour annuler une commande.

#### Quand mon bon de livraison sera-t-il disponible ?

Le bon de livraison est généré automatiquement quand l'admin passe votre commande en statut **"Préparée"**.

#### Quand ma facture sera-t-elle disponible ?

La facture est générée automatiquement quand l'admin passe votre commande en statut **"Livrée"**.

#### Pourquoi ma commande est-elle en attente de validation ?

Votre commande nécessite une validation admin car elle contient des produits avec une marge négative ou inférieure au seuil configuré. Un administrateur validera votre commande prochainement.

### Paiements

#### Comment payer ma facture ?

Les paiements sont enregistrés par l'administrateur. Vous pouvez payer par :
- **Espèces** : À la livraison ou au bureau
- **Chèque** : Remettez le chèque à l'administrateur avec la référence
- **Virement** : Effectuez le virement bancaire (coordonnées fournies)

#### Puis-je payer en plusieurs fois ?

Oui, les paiements partiels sont possibles. Chaque paiement est enregistré séparément dans l'historique.

### Produits et stock

#### Un produit n'apparaît pas dans le catalogue

Le produit peut être :
- Hors stock (si l'admin configure l'affichage)
- Retiré du catalogue par l'admin
- Contactez l'admin pour plus d'informations

#### Les prix sont différents selon les clients

Oui, les prix peuvent varier selon le **segment** du client (LABO, DENTISTE, REVENDEUR). Les prix sont calculés automatiquement selon votre profil.

---

## Support

Pour toute question ou problème :
- Contactez votre administrateur
- Consultez la documentation technique (si disponible)
- Vérifiez les logs d'audit (admins uniquement)

---

**Dernière mise à jour** : Janvier 2025
