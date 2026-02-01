# Informations Utiles pour le Livreur

## 📋 Résumé

Ce document liste les informations actuellement disponibles pour le livreur et suggère des améliorations pour optimiser l'efficacité des livraisons.

---

## ✅ Informations Actuellement Disponibles

### 1. **Informations Client**
- ✅ Nom du client
- ✅ Nom de l'entreprise (si applicable)
- ✅ Email
- ✅ Téléphone client
- ✅ Téléphone de livraison (si différent)

### 2. **Adresse de Livraison**
- ✅ Adresse complète
- ✅ Ville
- ✅ Téléphone de livraison

### 3. **Informations Commande**
- ✅ Numéro de commande
- ✅ Date d'expédition
- ✅ Code de confirmation (6 chiffres)

### 4. **Interface**
- ✅ Formulaire de confirmation de livraison
- ✅ Champ pour nom de la personne qui reçoit
- ✅ Champ pour notes de preuve de livraison

---

## 🚀 Informations Manquantes (Suggérées)

### 1. **Montant à Encaisser (COD)** 💰
**Utilité** : ⭐⭐⭐ **CRITIQUE**

**Pourquoi** :
- Le livreur doit savoir combien encaisser lors de la livraison
- Évite les erreurs de montant
- Permet de préparer la monnaie

**Affichage suggéré** :
```
Montant à encaisser : 1,250.00 Dh TTC
```

**Où** : Dans la carte de commande, section visible

---

### 2. **Liste des Produits** 📦
**Utilité** : ⭐⭐⭐ **CRITIQUE**

**Pourquoi** :
- Vérifier que tous les produits sont présents
- Confirmer avec le client ce qui est livré
- Éviter les erreurs de livraison

**Affichage suggéré** :
```
Produits à livrer :
- Produit A × 2
- Produit B × 1
- Produit C × 3
```

**Où** : Section dédiée dans la carte de commande

---

### 3. **Méthode de Paiement Attendue** 💳
**Utilité** : ⭐⭐ **IMPORTANT**

**Pourquoi** :
- Savoir si le client paiera en espèces, chèque, carte, etc.
- Préparer le matériel nécessaire (TPE, reçu, etc.)
- Éviter les malentendus

**Affichage suggéré** :
```
Méthode de paiement : Espèces (ou Chèque, Carte, Virement)
```

**Où** : À côté du montant à encaisser

**Note** : Cette information pourrait être ajoutée par l'admin lors de l'expédition, ou laisser le livreur choisir lors de la confirmation.

---

### 4. **Instructions Spéciales / Notes** 📝
**Utilité** : ⭐⭐ **IMPORTANT**

**Pourquoi** :
- Instructions de livraison (ex: "Livrer entre 9h et 12h")
- Notes du client (ex: "Sonner 2 fois")
- Informations importantes (ex: "Code d'accès: 1234")

**Affichage suggéré** :
```
Instructions de livraison :
- Livrer entre 9h et 12h
- Sonner 2 fois
- Code d'accès: 1234
```

**Où** : Section dédiée, mise en évidence

**Champ existant** : `deliveryNote` dans le modèle Order (à vérifier si utilisé)

---

### 5. **Poids / Volume Approximatif** ⚖️
**Utilité** : ⭐ **OPTIONNEL**

**Pourquoi** :
- Planifier le véhicule nécessaire
- Estimer le temps de chargement
- Optimiser les tournées

**Affichage suggéré** :
```
Poids estimé : ~15 kg
Volume : ~0.5 m³
```

**Où** : Information secondaire

---

### 6. **Statut de Paiement** 💵
**Utilité** : ⭐⭐ **IMPORTANT**

**Pourquoi** :
- Savoir si la commande est déjà payée ou à payer à la livraison
- Éviter de demander un paiement déjà effectué
- Gérer les cas particuliers

**Affichage suggéré** :
```
Statut paiement : À encaisser (COD)
ou
Statut paiement : Déjà payé
```

**Où** : Badge visible dans la carte de commande

---

### 7. **Historique des Tentatives** 🔄
**Utilité** : ⭐ **OPTIONNEL**

**Pourquoi** :
- Voir si des tentatives précédentes ont échoué
- Comprendre pourquoi (client absent, adresse incorrecte, etc.)
- Planifier la prochaine tentative

**Affichage suggéré** :
```
Tentatives précédentes :
- 2026-01-20 14:30 : Client absent
- 2026-01-21 10:00 : Adresse incorrecte
```

**Où** : Section historique (si plusieurs tentatives)

---

### 8. **Carte / Localisation GPS** 🗺️
**Utilité** : ⭐⭐ **IMPORTANT**

**Pourquoi** :
- Navigation vers l'adresse
- Vérification de l'adresse
- Optimisation des tournées

**Affichage suggéré** :
- Lien vers Google Maps / OpenStreetMap
- Coordonnées GPS (si disponibles)

**Où** : Bouton "Ouvrir dans Maps" à côté de l'adresse

---

### 9. **Contact d'Urgence** 📞
**Utilité** : ⭐⭐ **IMPORTANT**

**Pourquoi** :
- Contacter le client si problème
- Alternative si le téléphone principal ne répond pas
- Coordonner la livraison

**Affichage suggéré** :
```
Contact :
- Téléphone : +212 6XX XXX XXX
- Téléphone alternatif : +212 6XX XXX XXX (si disponible)
```

**Où** : Section contact mise en évidence

---

### 10. **Date/Heure de Livraison Préférée** 📅
**Utilité** : ⭐⭐ **IMPORTANT**

**Pourquoi** :
- Respecter les préférences du client
- Planifier les tournées
- Éviter les déplacements inutiles

**Affichage suggéré** :
```
Livraison préférée :
- Date : 2026-01-25
- Heure : 14:00 - 17:00
```

**Où** : Badge visible dans la carte de commande

---

## 📊 Priorisation des Informations

### Priorité 1 (CRITIQUE) - À Ajouter en Priorité
1. ✅ **Montant à encaisser** (COD)
2. ✅ **Liste des produits**

### Priorité 2 (IMPORTANT) - À Ajouter
3. ⚠️ **Méthode de paiement attendue**
4. ⚠️ **Statut de paiement**
5. ⚠️ **Instructions spéciales / Notes**
6. ⚠️ **Carte / Localisation GPS**
7. ⚠️ **Contact d'urgence**
8. ⚠️ **Date/Heure de livraison préférée**

### Priorité 3 (OPTIONNEL) - À Considérer
9. ⚠️ **Poids / Volume approximatif**
10. ⚠️ **Historique des tentatives**

---

## 🎯 Recommandations d'Implémentation

### Phase 1 : Informations Essentielles

#### 1. Montant à Encaisser
- **Source** : `invoice.totalTTC - totalPaid` (calculé)
- **Affichage** : Badge visible dans la carte de commande
- **Format** : "Montant à encaisser : 1,250.00 Dh TTC"

#### 2. Liste des Produits
- **Source** : `order.items` (relation existante)
- **Affichage** : Section dédiée avec liste
- **Format** : Liste avec nom, quantité, prix unitaire

#### 3. Statut de Paiement
- **Source** : `invoice.status` et `invoice.balance`
- **Affichage** : Badge coloré
- **Format** : "À encaisser" (rouge) ou "Déjà payé" (vert)

---

### Phase 2 : Améliorations UX

#### 4. Méthode de Paiement Attendue
- **Source** : Nouveau champ `expectedPaymentMethod` dans Order (optionnel)
- **Affichage** : Badge à côté du montant
- **Format** : "Paiement : Espèces" ou "Paiement : Chèque"

#### 5. Instructions Spéciales
- **Source** : `order.deliveryNote` (existant) ou nouveau champ
- **Affichage** : Section mise en évidence
- **Format** : Texte formaté avec icône

#### 6. Carte / Localisation
- **Source** : `order.deliveryAddress` + `order.deliveryCity`
- **Affichage** : Bouton "Ouvrir dans Maps"
- **Format** : Lien vers Google Maps avec adresse complète

---

## 💡 Exemple d'Interface Améliorée

```
┌─────────────────────────────────────────┐
│ Commande CMD-20260125-0074             │
│ Expédiée le 25/01/2026 à 10:30        │
├─────────────────────────────────────────┤
│                                         │
│ 🏢 Client                               │
│ Labo Dentaire ABC                       │
│ contact@laboabc.com                     │
│ Tél: +212 6XX XXX XXX                   │
│                                         │
│ 📍 Adresse de Livraison                 │
│ 123 Rue Example                         │
│ Casablanca                              │
│ Tél livraison: +212 6XX XXX XXX        │
│ [🗺️ Ouvrir dans Maps]                  │
│                                         │
│ 📦 Produits à Livrer                    │
│ • Produit A × 2 (100.00 Dh/unité)      │
│ • Produit B × 1 (50.00 Dh/unité)       │
│ • Produit C × 3 (75.00 Dh/unité)       │
│                                         │
│ 💰 Montant à Encaisser                  │
│ 1,250.00 Dh TTC                         │
│ Méthode : Espèces (ou Chèque, Carte)   │
│                                         │
│ 📝 Instructions                         │
│ Livrer entre 9h et 12h                  │
│ Sonner 2 fois                           │
│                                         │
│ 🔐 Code de Confirmation                 │
│ 123456                                  │
│                                         │
│ [Formulaire de confirmation...]         │
└─────────────────────────────────────────┘
```

---

## 🔧 Modifications Techniques Nécessaires

### 1. Ajouter les Informations dans la Requête

**Fichier** : `app/delivery/page.tsx`

**Modification** :
```typescript
const orders = await prisma.order.findMany({
  where: { ... },
  select: {
    // ... existant
    items: {
      include: {
        product: {
          select: {
            name: true,
            price: true
          }
        }
      }
    },
    invoice: {
      select: {
        status: true,
        amount: true,
        totalTTC: true, // Si disponible
        payments: {
          select: {
            amount: true
          }
        }
      }
    }
  }
})
```

### 2. Afficher les Informations dans l'Interface

**Fichier** : `app/delivery/page.tsx`

**Ajout** :
- Section "Produits à livrer"
- Badge "Montant à encaisser"
- Badge "Statut de paiement"
- Section "Instructions" (si `deliveryNote` existe)
- Bouton "Ouvrir dans Maps"

---

## ✅ Checklist d'Implémentation

### Phase 1 (Essentiel)
- [ ] Ajouter `items` dans la requête Prisma
- [ ] Ajouter `invoice` avec `payments` dans la requête
- [ ] Afficher la liste des produits
- [ ] Calculer et afficher le montant à encaisser
- [ ] Afficher le statut de paiement

### Phase 2 (Améliorations)
- [ ] Ajouter champ `expectedPaymentMethod` (optionnel)
- [ ] Afficher les instructions (`deliveryNote`)
- [ ] Ajouter bouton "Ouvrir dans Maps"
- [ ] Améliorer l'affichage des contacts

---

## 📝 Notes

### Informations Sensibles
- ⚠️ **Montant** : Information sensible, à afficher uniquement au livreur assigné
- ⚠️ **Coordonnées client** : Déjà protégées par l'authentification

### Performance
- Les requêtes avec `items` et `invoice` peuvent être lourdes
- Considérer la pagination si beaucoup de commandes
- Mettre en cache les calculs de montant si possible

### Accessibilité Mobile
- L'interface livreur est souvent utilisée sur mobile
- Optimiser l'affichage pour petits écrans
- Bouton "Ouvrir dans Maps" très utile sur mobile

---

## 🎯 Conclusion

Les informations **les plus utiles** pour le livreur sont :

1. **Montant à encaisser** (COD) - CRITIQUE
2. **Liste des produits** - CRITIQUE
3. **Statut de paiement** - IMPORTANT
4. **Instructions spéciales** - IMPORTANT
5. **Carte / Localisation** - IMPORTANT

Ces informations permettront au livreur de :
- ✅ Savoir exactement quoi livrer
- ✅ Savoir combien encaisser
- ✅ Trouver l'adresse facilement
- ✅ Respecter les instructions du client
- ✅ Éviter les erreurs
