# Guide d'Accès à l'Espace Livreur

## 🔐 Comment Accéder à l'Espace Livreur

### Méthode 1 : Connexion avec un compte MAGASINIER existant

1. **Aller sur** : `http://localhost:3000/login`
2. **Se connecter avec** :
   - **Email** : `stock@douma.com`
   - **Mot de passe** : `Douma@2025!123` (ou le mot de passe défini dans `.env` via `ADMIN_PASSWORD`)
3. **Redirection automatique** : Vous serez automatiquement redirigé vers `/delivery`

### Méthode 2 : Créer un nouveau compte livreur

Si le compte `stock@douma.com` n'existe pas, utilisez le script :

```bash
node scripts/create-delivery-user.js email@example.com "Nom Livreur"
```

Ou créez-le manuellement via l'interface admin :
1. Connectez-vous en tant qu'admin
2. Allez dans **Clients** → **Inviter un client**
3. Créez un utilisateur avec le rôle **MAGASINIER** (à modifier après dans la base de données)

## 📋 Vérification de l'Accès

### Vérifier si vous avez un compte livreur

```bash
node scripts/check-delivery-users.js
```

Cette commande vous montrera :
- ✅ Tous les comptes MAGASINIER disponibles
- 📦 Les commandes expédiées visibles dans l'espace livreur

## 🎯 Que Voir dans l'Espace Livreur

Une fois connecté, vous verrez :

1. **Header** : "Espace Livreur" avec votre nom et bouton de déconnexion
2. **Liste des commandes** : Toutes les commandes avec status `SHIPPED` (expédiées)
3. **Pour chaque commande** :
   - Numéro de commande
   - Code de confirmation (affiché en bleu)
   - Informations du client
   - Adresse de livraison
   - Formulaire de confirmation

## 🚨 Problèmes Courants

### 1. Redirection vers `/login` après connexion

**Cause** : Votre compte n'a pas le rôle `MAGASINIER`

**Solution** :
- Vérifiez votre rôle dans la base de données
- Ou connectez-vous avec `stock@douma.com`

### 2. "Aucune commande à livrer"

**Cause** : Aucune commande n'est expédiée (status `SHIPPED`)

**Solution** :
1. Connectez-vous en tant qu'admin
2. Allez dans **Commandes**
3. Préparer une commande (status `PREPARED`)
4. **Expédier** la commande (status `SHIPPED`)
5. Un code de confirmation sera généré automatiquement
6. Retournez dans l'espace livreur pour voir la commande

### 3. Erreur 404 sur `/delivery`

**Cause** : Le fichier `app/delivery/page.tsx` n'existe pas ou il y a une erreur

**Solution** :
- Vérifiez que les fichiers suivants existent :
  - `app/delivery/page.tsx`
  - `app/delivery/layout.tsx`
  - `app/delivery/DeliveryConfirmationForm.tsx`
  - `app/actions/delivery.ts`
- Vérifiez les erreurs dans la console du serveur

### 4. Code de confirmation manquant

**Cause** : La commande a été expédiée avant l'ajout de la fonctionnalité de code

**Solution** :
- Expédier à nouveau la commande (passer de `PREPARED` à `SHIPPED`)
- Le code sera généré automatiquement

## 🔧 Vérification Technique

### Vérifier que la redirection fonctionne

Dans `app/actions/auth.ts`, après connexion :

```typescript
if (user.role === 'ADMIN') {
  redirect('/admin')
} else if (user.role === 'MAGASINIER') {
  redirect('/delivery')  // ← Doit rediriger ici
} else {
  redirect('/portal')
}
```

### Vérifier que le layout existe

Le fichier `app/delivery/layout.tsx` doit :
- Vérifier que l'utilisateur est `MAGASINIER` ou `ADMIN`
- Afficher le header "Espace Livreur"
- Inclure `ToasterProvider` pour les notifications

## 📝 Test Rapide

1. **Connexion** : `http://localhost:3000/login` avec `stock@douma.com`
2. **Vérification** : Vous devez être redirigé vers `/delivery`
3. **Si vide** : Expédier une commande depuis l'admin
4. **Si erreur** : Vérifier la console du serveur

## ✅ Checklist d'Accès

- [ ] Compte MAGASINIER existe (vérifier avec `check-delivery-users.js`)
- [ ] Connexion réussie avec email et mot de passe
- [ ] Redirection vers `/delivery` après connexion
- [ ] Header "Espace Livreur" visible
- [ ] Au moins une commande expédiée (status `SHIPPED`)
- [ ] Code de confirmation visible sur les commandes

## 🆘 Support

Si le problème persiste :
1. Vérifiez les logs du serveur Next.js
2. Vérifiez la console du navigateur (F12)
3. Assurez-vous que `npm run dev` est en cours d'exécution
4. Vérifiez que la base de données est à jour (`npx prisma db push`)
