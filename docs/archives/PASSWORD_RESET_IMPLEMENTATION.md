# Fonctionnalité de Réinitialisation de Mot de Passe

## Vue d'ensemble

Une fonctionnalité complète de réinitialisation de mot de passe a été implémentée pour permettre aux utilisateurs de réinitialiser leur mot de passe en cas d'oubli.

## Fonctionnalités

### 1. Demande de réinitialisation (`/forgot-password`)
- L'utilisateur entre son adresse email
- Un token sécurisé est généré et stocké dans la base de données
- Un email avec un lien de réinitialisation est envoyé
- Le lien est valide pendant **1 heure**

### 2. Réinitialisation (`/reset-password/[token]`)
- L'utilisateur clique sur le lien reçu par email
- Le token est validé (existence, expiration, utilisation)
- L'utilisateur entre un nouveau mot de passe (minimum 6 caractères)
- Le mot de passe est mis à jour et le token est marqué comme utilisé

### 3. Sécurité
- Les tokens sont uniques et sécurisés (32 bytes hex)
- Les tokens expirés sont automatiquement invalidés
- Les tokens utilisés ne peuvent pas être réutilisés
- Les anciens tokens sont supprimés lors de la création d'un nouveau
- Les tentatives de réinitialisation sont enregistrées dans les logs d'audit
- Le système ne révèle pas si un email existe (sécurité contre l'énumération)

## Fichiers créés/modifiés

### Nouveaux fichiers
- `app/forgot-password/page.tsx` - Page de demande de réinitialisation
- `app/reset-password/[token]/page.tsx` - Page de réinitialisation (serveur)
- `app/reset-password/[token]/ResetPasswordForm.tsx` - Formulaire de réinitialisation (client)

### Fichiers modifiés
- `prisma/schema.prisma` - Ajout du modèle `PasswordResetToken`
- `app/actions/auth.ts` - Ajout de `requestPasswordReset` et `resetPasswordAction`
- `lib/email.ts` - Ajout de `sendPasswordResetEmail`
- `app/login/page.tsx` - Ajout du lien "Mot de passe oublié ?"

## Modèle de base de données

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique
  email     String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  usedAt    DateTime?
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([token])
  @@index([email])
  @@index([userId])
}
```

## Migration Prisma

Pour appliquer les changements à la base de données :

```bash
npx prisma migrate dev --name add_password_reset_token
```

Ou si vous utilisez `db push` :

```bash
npx prisma db push
```

## Utilisation

### Pour l'utilisateur

1. **Oublier le mot de passe** :
   - Aller sur `/login`
   - Cliquer sur "Mot de passe oublié ?"
   - Entrer son adresse email
   - Cliquer sur "Envoyer le lien de réinitialisation"

2. **Réinitialiser le mot de passe** :
   - Ouvrir l'email reçu
   - Cliquer sur le lien de réinitialisation
   - Entrer un nouveau mot de passe (minimum 6 caractères)
   - Confirmer le mot de passe
   - Cliquer sur "Réinitialiser le mot de passe"
   - Redirection automatique vers la page de connexion

### Pour l'administrateur

Les actions de réinitialisation sont enregistrées dans les logs d'audit :
- `PASSWORD_RESET_REQUESTED` - Quand un utilisateur demande une réinitialisation
- `PASSWORD_RESET` - Quand un utilisateur réinitialise effectivement son mot de passe

## Configuration

### Variables d'environnement

- `NEXT_PUBLIC_APP_URL` - URL de base de l'application (pour les liens dans les emails)
- `RESEND_API_KEY` - Clé API Resend pour l'envoi d'emails

### Durée de validité

Par défaut, les tokens de réinitialisation sont valides pendant **1 heure**. Pour modifier cette durée, éditez la ligne suivante dans `app/actions/auth.ts` :

```typescript
const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
```

## Sécurité

### Bonnes pratiques implémentées

1. ✅ **Pas d'énumération d'emails** : Le système retourne toujours un succès même si l'email n'existe pas
2. ✅ **Tokens sécurisés** : Génération avec `randomBytes(32)` (256 bits)
3. ✅ **Expiration automatique** : Les tokens expirent après 1 heure
4. ✅ **Usage unique** : Les tokens ne peuvent être utilisés qu'une seule fois
5. ✅ **Suppression des anciens tokens** : Les anciens tokens sont supprimés lors de la création d'un nouveau
6. ✅ **Validation côté serveur** : Toute la logique de validation est côté serveur
7. ✅ **Audit logging** : Toutes les actions sont enregistrées
8. ✅ **Hashage sécurisé** : Utilisation de bcrypt avec 10 rounds

## Tests

Pour tester la fonctionnalité :

1. Créer un utilisateur de test
2. Aller sur `/forgot-password`
3. Entrer l'email de l'utilisateur
4. Vérifier l'email reçu (ou les logs en développement)
5. Cliquer sur le lien
6. Réinitialiser le mot de passe
7. Se connecter avec le nouveau mot de passe

## Notes importantes

- ⚠️ En mode développement (sans `RESEND_API_KEY`), les emails ne sont pas envoyés mais les logs sont affichés dans la console
- ⚠️ Les tokens expirés ou utilisés affichent un message d'erreur approprié
- ⚠️ Le lien "Mot de passe oublié ?" est visible sur la page de connexion pour tous les utilisateurs
