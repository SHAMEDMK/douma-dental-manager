# Plan : Ajout des références / SKU

## Objectif
Ajouter des identifiants uniques pour les **produits** (SKU) et les **clients** (code client) dans Douma Dental Manager.

## 1. Schéma de données

| Entité | Champ | Type | Contrainte | Rôle |
|--------|-------|------|------------|------|
| **Product** | `sku` | String? | @unique | Référence produit (ex: PROD-001) |
| **User** (client) | `clientCode` | String? | @unique | Code client (ex: CLI-001) |

- **Optionnel** : les enregistrements existants restent sans référence.
- **Unique** : pas de doublon pour permettre recherche et export.

## 2. Formulaires

- **Produit** : champ "Référence / SKU" (création + édition).
- **Client** : champ "Code client" (invitation + édition client).

## 3. Listes et affichage

- **Admin Produits** : colonne SKU.
- **Admin Clients** : colonne Code client.
- **Magasinier Stock** : colonne SKU.
- **Détail commande / BL / Facture** : afficher SKU produit et code client si présents.

## 4. Documents et exports

- **Factures, BL, bons de préparation** : inclure SKU sur les lignes, code client en en-tête.
- **Exports CSV/Excel** : colonnes SKU et code client.

## 5. Génération automatique (optionnel)

- Produits : génération possible (ex: PROD-00001) à la création si vide.
- Clients : génération possible (ex: CLI-00001) à l’invitation si vide.

## 6. Ordre d’implémentation

1. ✅ Schéma Prisma + migration
2. ✅ Formulaires produit (SKU)
3. ✅ Formulaires client (code)
4. ✅ Listes (produits, clients, stock) + détail commande
5. Documents et exports (optionnel : API export existantes à étendre)

## 7. Appliquer la migration

En local, exécuter :

```bash
npx prisma migrate deploy
```

ou pour créer la migration si elle n’existe pas encore :

```bash
npx prisma migrate dev --name add_sku_and_client_code
```

Puis régénérer le client Prisma :

```bash
npx prisma generate
```
