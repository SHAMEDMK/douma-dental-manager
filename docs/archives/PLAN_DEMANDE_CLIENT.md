# Plan d'Implémentation : Bloc de Demande Client

## 📋 Fonctionnalités à Implémenter

### 1. Base de Données
Nouveau modèle `ClientRequest` :
```prisma
model ClientRequest {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  type        String   // "PRODUCT_REQUEST" | "ADVICE" | "CONTACT" | "REMARK"
  message     String   // Texte limité (ex: 500 caractères)
  status      String   @default("PENDING") // "PENDING" | "READ" | "RESOLVED"
  adminNotes  String?  // Notes internes admin
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  readAt      DateTime? // Quand l'admin a lu
  resolvedAt  DateTime? // Quand résolu
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}
```

### 2. Interface Client
- **Page** : `/portal/request` ou bloc dans la page d'accueil
- **Formulaire** avec :
  - Type de demande (sélection) :
    - 🔍 Besoin de produit
    - 💡 Demande de conseil
    - 📝 Remarque/Suggestion
    - 📞 Demande de contact
  - Message (textarea limité à 500 caractères)
  - Compteur de caractères
  - Bouton "Envoyer"
- **Confirmation** : Message de succès après envoi
- **Historique** : Liste des demandes envoyées (optionnel)

### 3. Interface Admin
- **Page** : `/admin/requests`
- **Liste** avec :
  - Filtres : Tous / En attente / Lues / Résolues
  - Tri par date (plus récentes en premier)
  - Badge "Nouveau" pour les non lues
- **Détails** :
  - Informations client (nom, email, téléphone)
  - Type de demande
  - Message
  - Date de création
  - Actions : Marquer comme lu / Résolu
  - Notes internes (admin seulement)
  - Bouton "Contacter le client" (email/téléphone)

### 4. Menu Client
Ajouter un lien "Contact" ou "Demande" dans le menu navigation

---

## ✅ Avantages
- ✅ Communication directe client → admin
- ✅ Traçabilité des demandes
- ✅ Gestion centralisée côté admin
- ✅ Simple à utiliser
- ✅ Pas de spam (limite de caractères)

## ⚠️ Points à considérer
- Limite de caractères (500 recommandé)
- Notification admin (optionnel : email/badge)
- Rate limiting pour éviter le spam

---

## 🚀 Implémentation Proposée

**Étape 1** : Modèle de base de données
**Étape 2** : Formulaire client
**Étape 3** : Page admin de gestion
**Étape 4** : Lien dans le menu

**Temps estimé** : 2-3 heures

Souhaitez-vous que je procède à l'implémentation ?
