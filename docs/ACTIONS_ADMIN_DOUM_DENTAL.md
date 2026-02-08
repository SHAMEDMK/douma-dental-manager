# Actions utiles Admin – Doum Dental

Ce document liste les **actions utiles** que l’administrateur doit pouvoir faire pour bien gérer l’application Doum Dental (hors suppression de facture déjà traitée).

---

## 1. Tableau de bord

| Action | Où | Utilité |
|--------|-----|--------|
| **Voir les indicateurs** | Admin → Tableau de bord | Commandes en attente, factures impayées, stock bas, commandes à valider, demandes clients |
| **Alertes dans le menu** | Sidebar (badges) | Repérage rapide des tâches prioritaires |

---

## 2. Paramètres (configuration)

| Action | Où | Utilité |
|--------|-----|--------|
| **Informations entreprise** | Paramètres → Informations entreprise | Raison sociale, adresse, ICE, IF, RC, TVA, conditions de paiement, logo – utilisés sur factures et BL |
| **Règles d’approbation** | Paramètres → Règles d’approbation | Marges négatives / faibles → validation manuelle des commandes |
| **Message d’approbation** | Idem | Texte affiché sur les commandes à valider |

---

## 3. Clients

| Action | Où | Utilité |
|--------|-----|--------|
| **Inviter un client** | Clients → Inviter un client | Email, nom, segment (LABO/DENTISTE/REVENDEUR), remise %, plafond de crédit |
| **Voir / modifier un client** | Clients → clic sur un client | Infos, commandes, CA, solde, plafond |
| **Modifier plafond de crédit** | Fiche client → Modifier | Contrôle du crédit autorisé |
| **Supprimer un client** | Fiche client → Supprimer | Nettoyage (si pas de commandes) |

---

## 4. Utilisateurs et rôles

| Action | Où | Utilité |
|--------|-----|--------|
| **Créer un comptable** | Utilisateurs → Créer comptable | Accès factures / paiements |
| **Créer un magasinier** | Utilisateurs → Créer magasinier | Préparation commandes, stock |
| **Corriger le type utilisateur** | Utilisateurs → Fix user type | MAGASINIER vs LIVREUR si mal affecté |
| **Supprimer un comptable** | Fiche utilisateur | Retrait des droits |

---

## 5. Livreurs (agents de livraison)

| Action | Où | Utilité |
|--------|-----|--------|
| **Créer un agent de livraison** | Livreurs → Nouveau | Associer un utilisateur MAGASINIER/LIVREUR à la livraison |
| **Réassigner une commande** | Fiche commande → Réassigner | Changer le livreur affecté |
| **Supprimer un agent** | Livreurs → Supprimer | Nettoyage |

---

## 6. Produits

| Action | Où | Utilité |
|--------|-----|--------|
| **Créer un produit** | Produits → Nouveau produit | Nom, prix par segment (LABO/DENTISTE/REVENDEUR), coût, stock, catégorie, image |
| **Modifier un produit** | Fiche produit → Modifier | Prix, description, catégorie (les commandes déjà passées gardent l’ancien prix) |
| **Supprimer un produit** | Fiche produit → Supprimer | Avec option « Supprimer quand même » si utilisé dans des commandes (supprime les lignes puis le produit) |
| **Options de variantes** | Fiche produit → Onglet Options | Créer options (ex. Variété, Teinte, Dimension) et valeurs |
| **Variantes** | Fiche produit → Onglet Variantes | Créer/modifier/supprimer variantes, générer à partir des options, import en masse |
| **Vérifier SKU disponible** | Formulaire variante (blur SKU) | Éviter les doublons de SKU |

---

## 7. Commandes

| Action | Où | Utilité |
|--------|-----|--------|
| **Changer le statut** | Fiche commande → Statut | CONFIRMED → PREPARING → SHIPPED → DELIVERED |
| **Valider une commande (marge)** | Fiche commande → Valider | Débloquer si « marge anormale » |
| **Modifier les lignes** | Fiche commande → Modifier | Ajouter/supprimer lignes, modifier quantités (si commande modifiable) |
| **Préparer (générer BL)** | Bouton Préparer | Création du bon de livraison, envoi email client |
| **Expédier** | Bouton Expédier | Saisie infos livraison, envoi email |
| **Livrer** | Bouton Livrer | Génération facture, envoi email facture |
| **Réassigner le livreur** | Fiche commande | Changer l’agent de livraison |
| **Annuler la commande** | Bouton Annuler | Libération du stock, ajustement solde (si facture non payée) |
| **Paiement COD** | Fiche commande (si COD) | Enregistrer paiement à la livraison |

---

## 8. Factures

| Action | Où | Utilité |
|--------|-----|--------|
| **Voir / imprimer une facture** | Factures → détail → Voir/Imprimer | Consultation et impression PDF |
| **Télécharger PDF** | Factures → détail → Télécharger PDF | Envoi au client |
| **Encaisser un paiement** | Factures → détail → Encaisser | Complet ou partiel (espèces, chèque, virement) |
| **Modifier un paiement** | Factures → détail → historique | Montant, méthode, référence (si facture non payée) |
| **Supprimer un paiement** | Factures → détail | Retirer un paiement partiel (si facture non payée) |
| **Marquer facture payée** | Depuis commande ou facture | Marquer comme payée sans détail de paiement |
| **Supprimer une facture** | Factures → détail → Supprimer la facture | Nettoyage (paiements + facture, commande reste) |

---

## 9. Paiements

| Action | Où | Utilité |
|--------|-----|--------|
| **Voir tous les paiements** | Paiements | Liste globale avec filtre par méthode, date, client |

---

## 10. Stock

| Action | Où | Utilité |
|--------|-----|--------|
| **Voir état du stock** | Stock | Produits et variantes : stock actuel, minimum, alerte (OK / stock bas / rupture) |
| **Ajuster le stock** | Stock → produit → Ajuster | Entrée / sortie / ajustement + motif |
| **Voir les mouvements** | Stock → Mouvements | Historique des entrées/sorties par produit ou variante |

---

## 11. Demandes clients

| Action | Où | Utilité |
|--------|-----|--------|
| **Voir les demandes** | Demandes clients | Demandes envoyées par les clients (catalogue, produits, etc.) |
| **Changer le statut** | Fiche demande | Traiter (ouvert / en cours / clôturé) |

---

## 12. Logs et audit

| Action | Où | Utilité |
|--------|-----|--------|
| **Logs d’audit** | Logs d’audit | Qui a fait quoi (création/modification/suppression) sur commandes, factures, produits, etc. |
| **Audit emails** | Audit Emails | Vérifier les emails envoyés (factures, BL, invitations) |

---

## 13. Sauvegardes

| Action | Où | Utilité |
|--------|-----|--------|
| **Backups** | Backups (si activé) | Consulter / télécharger les sauvegardes de la base |

---

## Synthèse des actions « indispensables »

Pour bien gérer Doum Dental au quotidien, l’admin doit au minimum pouvoir :

1. **Paramétrer** l’entreprise (infos, TVA, règles d’approbation).
2. **Gérer les clients** : inviter, modifier (dont plafond de crédit).
3. **Gérer le catalogue** : créer/modifier produits et variantes, options (Teinte, Dimension, etc.).
4. **Suivre les commandes** : statuts (Préparer → Expédier → Livrer), validation marge, modification des lignes si besoin.
5. **Facturation et encaissements** : génération facture à la livraison, enregistrer paiements (complet/partiel), modifier/supprimer paiement si facture non payée.
6. **Stock** : consulter stock, faire des ajustements (entrée/sortie) et consulter les mouvements.
7. **Utilisateurs** : créer comptable / magasinier, gérer les livreurs (agents de livraison).
8. **Contrôle** : logs d’audit, et si besoin suppression d’une facture (cas exceptionnel).

Toutes ces actions sont déjà disponibles dans l’application ; ce document sert de checklist et de référence pour l’admin Doum Dental.
