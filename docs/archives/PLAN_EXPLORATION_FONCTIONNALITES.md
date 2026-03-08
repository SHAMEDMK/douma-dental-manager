# Plan d'Exploration des Fonctionnalités - Tests E2E

## 📋 Fonctionnalités à Explorer et Tester

### ✅ Déjà Testées
- [x] Login (client, admin, livreur)
- [x] Création de commande client
- [x] Préparation de commande (admin)
- [x] Expédition de commande (admin)
- [x] Livraison avec code de confirmation (livreur)
- [x] Paiements (partiel et complet)
- [x] Gestion des crédits clients

### 🔍 Fonctionnalités à Explorer

#### 1. **Gestion des Produits** (`/admin/products`)
- [ ] Créer un nouveau produit
- [ ] Modifier un produit existant
- [ ] Supprimer un produit
- [ ] Gérer les prix par segment (LABO, DENTISTE, REVENDEUR)
- [ ] Gérer le stock et les alertes de stock bas

#### 2. **Gestion des Clients** (`/admin/clients`)
- [ ] Créer un nouveau client
- [ ] Modifier les informations client
- [ ] Supprimer un client
- [ ] Gérer les invitations clients
- [ ] Gérer les crédits et plafonds

#### 3. **Gestion des Livreurs** (`/admin/delivery-agents`)
- [ ] Créer un nouveau livreur
- [ ] Supprimer un livreur
- [ ] Vérifier l'assignation des commandes

#### 4. **Gestion du Stock** (`/admin/stock`)
- [ ] Voir la liste des produits avec stock
- [ ] Ajuster le stock d'un produit
- [ ] Voir les mouvements de stock
- [ ] Vérifier les alertes de stock bas

#### 5. **Dashboard Admin** (`/admin/dashboard`)
- [ ] Vérifier les statistiques affichées
- [ ] Vérifier les liens vers les différentes sections
- [ ] Vérifier les comptes internes (MAGASINIER, COMPTABLE)

#### 6. **Paramètres** (`/admin/settings`)
- [ ] Gérer les paramètres admin (marges, approbations)
- [ ] Gérer les paramètres entreprise (TVA, nom, etc.)

#### 7. **Factures** (`/admin/invoices`)
- [ ] Filtrer les factures (statut, client, date)
- [ ] Exporter les factures
- [ ] Voir l'historique des paiements

#### 8. **Paiements** (`/admin/payments`)
- [ ] Voir la liste des paiements
- [ ] Filtrer les paiements

#### 9. **Logs d'Audit** (`/admin/audit`)
- [ ] Voir les logs d'audit
- [ ] Filtrer les logs

#### 10. **Backups** (`/admin/backups`)
- [ ] Voir les backups disponibles
- [ ] Créer un backup manuel

#### 11. **Portail Client - Fonctionnalités Avancées**
- [ ] Modifier une commande (si modifiable)
- [ ] Voir les favoris
- [ ] Ajouter/retirer des favoris
- [ ] Voir le bon de livraison
- [ ] Télécharger la facture PDF

## 🧪 Tests E2E à Créer

### Priorité Haute
1. **Test de création de produit**
   - Créer un produit avec tous les champs
   - Vérifier qu'il apparaît dans la liste
   - Vérifier les prix par segment

2. **Test de gestion de stock**
   - Ajuster le stock d'un produit
   - Vérifier les mouvements de stock
   - Vérifier les alertes de stock bas

3. **Test de création de client**
   - Créer un client via invitation
   - Vérifier que le client peut se connecter

### Priorité Moyenne
4. **Test de modification de commande client**
   - Modifier une commande CONFIRMED
   - Vérifier que la modification est bloquée pour les autres statuts

5. **Test de filtres factures**
   - Filtrer par statut
   - Filtrer par client
   - Filtrer par date

6. **Test de dashboard admin**
   - Vérifier les statistiques
   - Vérifier les liens

### Priorité Basse
7. **Test de paramètres**
   - Modifier les paramètres admin
   - Modifier les paramètres entreprise

8. **Test de logs d'audit**
   - Vérifier l'affichage des logs
   - Vérifier les filtres

## 🛠️ Corrections Nécessaires

### Tests Actuels à Corriger
1. **delivery-workflow.spec.ts**
   - Le clic sur le numéro de commande ne navigue pas vers une page de détails
   - Solution: Utiliser l'expansion de la carte de commande ou naviguer directement vers `/portal/orders/[id]`

2. **payment-workflow.spec.ts**
   - Le sélecteur pour trouver les factures impayées ne fonctionne pas
   - Solution: Utiliser un sélecteur plus spécifique (badge, lien, etc.)

3. **full-workflow-delivery.spec.ts**
   - Même problème que delivery-workflow.spec.ts

## 📝 Notes

- Les tests doivent utiliser `data-testid` pour plus de stabilité
- Les tests doivent être indépendants (reset DB avant chaque test si nécessaire)
- Les tests doivent gérer les cas d'erreur et les états vides
