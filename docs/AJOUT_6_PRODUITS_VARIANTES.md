# Ajout des 6 produits (HT, HTML, HS, UHT, UTML, etc.) avec variantes Dimension et Teinte

## 1. Supprimer le produit existant Prod-009 / PROD-009

### Depuis l’admin (recommandé)

1. Aller dans **Admin → Produits** et ouvrir le produit **PROD-009** (ou Prod-009).
2. En bas de la fiche, cliquer sur **« Supprimer le produit »**.
3. Confirmer une première fois.
4. Si le message indique que le produit est utilisé dans des commandes, un second encadré propose **« Supprimer quand même »** : les lignes de commande concernées sont supprimées, puis le produit et toutes ses variantes. Confirmer pour appliquer.

### En ligne de commande (script)

```bash
# Refus si le produit est dans des commandes
node scripts/delete-product-by-sku.js Prod-009

# Pour forcer : supprime les lignes de commande puis le produit
node scripts/delete-product-by-sku.js Prod-009 --force
```

Si le SKU en base est **PROD-009** (majuscules), utiliser `PROD-009` dans la commande.

---

## 2. Créer les 6 produits (chacun avec Dimension et Teinte)

Chaque produit (HT, HTML, HS, UHT, UTML + un 6ᵉ de votre choix) aura **2 options** : **Dimension** et **Teinte**. Les variantes seront générées à partir de ces options.

### Depuis l’admin (recommandé)

Pour **chaque** produit (ex. HT) :

1. **Créer le produit**  
   Admin → Produits → Nouveau produit  
   - Nom : **HT** (ou HTML, HS, UHT, UTML, etc.)  
   - SKU : ex. **ZIRCONE-HT** (ou PROD-HT)  
   - Cocher **« Ce produit a des variantes »**  
   - Enregistrer.

2. **Définir les options**  
   Onglet **Options** du produit :  
   - Créer l’option **Dimension** (ordre 1 si vous utilisez l’ordre).  
   - Ajouter les valeurs (ex. A2, A3, 12, …).  
   - Créer l’option **Teinte** (ordre 2).  
   - Ajouter les valeurs (ex. Blanc, Noir, …).

3. **Générer les variantes**  
   Onglet **Variantes** → **Générer les variantes à partir des options**.  
   Une variante (SKU, stock, prix) est créée pour chaque combinaison Dimension × Teinte.

4. **Prix et stock**  
   - Renseigner les prix par segment (LABO, etc.) au niveau produit ou par variante.  
   - Ajuster le stock initial par variante si besoin.

Répéter pour : **HTML**, **HS**, **UHT**, **UTML** et le 6ᵉ produit.

### Résumé des 6 produits

| Produit | SKU suggéré   | Options      | Variantes              |
|--------|----------------|-------------|------------------------|
| HT     | ZIRCONE-HT     | Dimension, Teinte | Une par combinaison |
| HTML   | ZIRCONE-HTML   | Dimension, Teinte | idem              |
| HS     | ZIRCONE-HS     | Dimension, Teinte | idem              |
| UHT    | ZIRCONE-UHT    | Dimension, Teinte | idem              |
| UTML   | ZIRCONE-UTML   | Dimension, Teinte | idem              |
| 6ᵉ     | à définir      | Dimension, Teinte | idem              |

### Catalogue client

Avec **2 options** (Dimension, Teinte) uniquement, le catalogue affiche **une carte par variante** (toutes les combinaisons Dimension × Teinte).  
Si plus tard vous souhaitez un affichage « par produit » (une carte HT, puis choix Teinte/Dimension au panier), il faudrait étendre la logique « par variété » aux produits à 2 options (comme pour Zircone à 3 options).

---

## 3. Script optionnel (création des 6 produits en base)

Si vous préférez créer les 6 produits (sans variantes) par script, on peut ajouter un script qui :

- crée les 6 produits (HT, HTML, HS, UHT, UTML + un 6ᵉ) ;
- crée pour chacun les options **Dimension** et **Teinte** avec des valeurs par défaut (à personnaliser ensuite dans l’admin).

Souhaitez-vous que ce script soit ajouté au dépôt ?
