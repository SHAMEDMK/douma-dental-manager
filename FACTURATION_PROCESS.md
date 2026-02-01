# Processus de Facturation & Bon de Livraison - Douma Dental

## Vue d'ensemble

Ce document décrit le processus de facturation et de génération de bons de livraison (BL) dans l'application Douma Dental Manager.

## 1. Génération des Numéros

### Numéros de Commande (CMD)
- **Format** : `CMD-YYYYMMDD-####`
- **Génération** : Automatique lors de la création de commande
- **Séquence** : Globale par année (réinitialisée chaque année)
- **Exemple** : `CMD-20260104-0001`, `CMD-20260105-0002`

### Numéros de Facture (FAC)
- **Format** : `FAC-YYYYMMDD-####`
- **Génération** : Automatique lors de la création de facture (lors de la livraison de commande)
- **Séquence** : Globale par année (réinitialisée chaque année)
- **Exemple** : `FAC-20260104-0001`, `FAC-20260105-0002`
- **Fallback** : Pour les anciennes factures sans `invoiceNumber`, format `FAC-{invoiceId}`

### Numéros de Bon de Livraison (BL)
- **Format** : `BL-YYYYMMDD-####`
- **Génération** : Automatique lors du passage de commande au statut `PREPARED`
- **Séquence** : Globale par année (réinitialisée chaque année)
- **Exemple** : `BL-20260104-0001`, `BL-20260105-0002`

## 2. Processus de Facturation

### Création de Facture
1. **Déclencheur** : Passage d'une commande au statut `DELIVERED`
2. **Vérifications** :
   - La commande doit être en statut `DELIVERED`
   - Une facture ne doit pas déjà exister pour cette commande
   - Le numéro de facture doit être unique (vérification de doublon)
3. **Génération** :
   - Calcul du montant total HT (somme des `priceAtTime * quantity` des items)
   - Génération du numéro de facture séquentiel (`FAC-YYYYMMDD-####`)
   - Création de l'enregistrement `Invoice` avec statut `UNPAID`
   - Calcul du solde restant (montant TTC - paiements)

### Verrouillage de Facture
- **Condition** : Une facture est verrouillée si elle a au moins un paiement enregistré
- **Effet** : La facture ne peut plus être modifiée (pas de modification des items, montants, etc.)
- **Affichage** : Badge "🔒 Verrouillée" visible dans l'interface admin

### Statuts de Facture
- **UNPAID** : Non payée (solde = montant total)
- **PARTIAL** : Partiellement payée (0 < solde < montant total)
- **PAID** : Payée (solde = 0)
- **CANCELLED** : Annulée

## 3. Téléchargement PDF

### Nom de Fichier PDF
- **Format principal** : `{invoiceNumber}.pdf` (ex: `FAC-20260104-0001.pdf`)
- **Fallback** : `FAC-{invoiceId}.pdf` si `invoiceNumber` est null ou vide
- **Cohérence** : Le même nom de fichier est utilisé pour les téléchargements admin et client

### Routes API
- **Admin** : `/api/pdf/admin/invoices/[id]`
- **Client** : `/api/pdf/portal/invoices/[id]`
- **Sécurité** :
  - Admin : Vérification du rôle (ADMIN, COMPTABLE, MAGASINIER)
  - Client : Vérification que la facture appartient à l'utilisateur connecté

### Gestion d'Erreurs
- **Messages clairs** : Erreurs en français avec détails
- **Feedback utilisateur** : Toast d'erreur affiché si le téléchargement échoue
- **Icône PDF** : Bouton avec icône `FileDown` de Lucide React

## 4. Bon de Livraison (BL)

### Génération
- **Déclencheur** : Passage d'une commande au statut `PREPARED`
- **Format** : `BL-YYYYMMDD-####`
- **Séquence** : Globale par année

### Téléchargement PDF
- **Route** : `/api/pdf/admin/orders/[id]/delivery-note`
- **Nom de fichier** : `{deliveryNoteNumber}.pdf`
- **Accès** : Admin uniquement

## 5. Tests de Cohérence Recommandés

### Test de Séquence
1. Créer 3 commandes consécutives
2. Vérifier que les numéros de commande sont séquentiels
3. Livrer les commandes
4. Vérifier que les numéros de facture sont séquentiels

### Test de Téléchargement PDF
1. Télécharger une facture depuis l'admin
2. Télécharger la même facture depuis le portal client
3. Vérifier que :
   - Les noms de fichiers sont identiques
   - Les montants sont identiques
   - Le contenu est identique

### Test de Cas Limites
1. **Facture sans invoiceNumber** (ancienne) :
   - Vérifier que le fallback `FAC-{invoiceId}.pdf` fonctionne
2. **Réimpression d'une facture verrouillée** :
   - Vérifier que le PDF généré est identique
   - Vérifier que le nom de fichier est identique

## 6. Checklist de Vérification

### Fonctionnelle
- [x] Génération automatique des numéros séquentiels
- [x] Vérification d'unicité des numéros de facture
- [x] Verrouillage automatique après premier paiement
- [x] Calcul correct des montants HT/TTC
- [x] Gestion des statuts de facture
- [x] Téléchargement PDF fonctionnel (admin + client)
- [x] Noms de fichiers cohérents
- [x] Gestion d'erreurs claire

### Légale
- [x] Numérotation séquentielle des factures
- [x] Traçabilité des paiements
- [x] Conservation des factures verrouillées
- [x] Mentions légales sur les factures (TVA, conditions de paiement)
- [x] Informations client complètes (ICE, adresse, etc.)

## 7. Points d'Attention

### Sécurité
- Les factures sont accessibles uniquement par :
  - L'admin (toutes les factures)
  - Le client propriétaire (ses propres factures uniquement)
- Les PDF sont générés côté serveur avec authentification

### Performance
- Les PDF sont générés à la demande (pas de pré-génération)
- Utilisation de Playwright pour la génération PDF
- Timeout de 30 secondes pour la génération

### Maintenance
- Les numéros de séquence sont stockés dans `GlobalSequence`
- Réinitialisation automatique chaque année
- Pas de réutilisation de numéros (séquence incrémentale atomique)
