# Runbook incident production — Douma Dental Manager

Document structuré pour réagir aux incidents en production (Vercel + Prisma + PostgreSQL). Actionnable, sans secret, utilisable en situation de stress. À lire avant toute modification en prod.

**Références :** `docs/GO_LIVE_PLAN_MAR_2026.md` (rollback) · `docs/RESTAURATION_BACKUP.md` (restore DB) · `docs/PERF_AUDIT.md` (exports) · `docs/AUDIT_ACCOUNTING_CLOSE.md` (clôture comptable)

---

## 1) Principes généraux

- **Priorité** : intégrité des données > disponibilité > confort UX. Ne jamais sacrifier la cohérence des données pour rétablir le service à tout prix.
- **Base de données** : ne jamais modifier la DB directement en prod (UPDATE/DELETE manuels) sans procédure documentée et validée.
- **En cas de doute** : rollback applicatif (Promote previous deployment) avant toute action sur la DB.
- **Traçabilité** : tous les incidents doivent être documentés (date, symptôme, cause racine, action corrective, propriétaire). Utiliser la section 10 en fin d’incident.

---

## 2) Incident : Erreurs 5xx (500 / 503)

### Symptômes

- Pages admin ne chargent plus ou renvoient une erreur serveur.
- Export Excel renvoie 500.
- Logs Vercel montrent des erreurs Prisma ou des exceptions non catchées.

### Diagnostic rapide (5 minutes)

1. **Vercel** : Project → Logs → filtrer **Production** → onglet **Runtime Errors** / **Functions**. Repérer l’heure, la route et le message d’erreur.
2. **Identifier le type** :
   - **Prisma** : connexion (timeout, pool), migration, requête invalide.
   - **Logique applicative** : stack trace dans le code (fichier + ligne).
3. **Tests de base** :
   - `GET /api/health` : 200 = app + DB OK ; 503 = DB ou timeout.
   - `GET /api/admin/export/orders` sans cookie : **401** attendu (si 500 = bug côté auth ou route).

### Actions

- **Déploiement récent** : si l’incident apparaît juste après un deploy → **Promote previous deployment** (rollback Vercel). Vérifier que les 5xx disparaissent.
- **Erreur de migration** : exécuter `npx prisma migrate status` (avec DIRECT_URL prod, depuis une machine de confiance). Si état incohérent, ne pas lancer de migration destructive ; voir section 9 (rollback DB).
- **Timeout DB / connexions** : vérifier que **DATABASE_URL** est bien une URL **pooled** (Neon/Supabase/PgBouncer). Vérifier côté fournisseur DB : nombre de connexions actives, limites du plan. En dernier recours, augmenter timeout ou capacité selon la doc du provider.

---

## 3) Incident : Export 413 / timeout export

### Symptômes

- Message utilisateur : **« Export refusé : trop de lignes (X > Y). Réduisez la période ou contactez l'administrateur. »**
- Timeout Vercel sur les routes `/api/admin/export/*` (pas de réponse ou 504).

### Diagnostic

- **EXPORT_MAX_ROWS** : vérifier la valeur en Production (Vercel → Environment Variables). Si très bas (ex. 1), le message 413 est attendu ; si élevé et message quand même, la volumétrie dépasse la limite.
- **Volumétrie** : évaluer le nombre de lignes concernées (commandes, factures, clients, paiements) via l’app ou un count si outil disponible. Comparer à la limite configurée.
- **Logs Vercel** : regarder la **duration** des invocations des routes d’export. Proche de la limite de durée Vercel (ex. 10 s / 60 s) = risque timeout.

### Actions

- **Ajustement temporaire** : augmenter **EXPORT_MAX_ROWS** en Production si la limite est trop basse pour le besoin métier (ex. 20 000). Documenter la décision.
- **Réduire la période** : demander à l’utilisateur de restreindre les dates ou le périmètre d’export pour rester sous la limite.
- **À moyen terme** : planifier une évolution type PR3 (export en streaming / pagination) pour éviter de tout charger en mémoire ; voir `docs/PERF_AUDIT.md`.

---

## 4) Incident : Paiement incohérent / double paiement suspecté

### Symptômes

- Client signale un surpaiement ou un solde inattendu.
- Écart entre le total des paiements et le montant de la facture, ou solde affiché incohérent.

### Diagnostic

1. **Paiements** : dans l’app (admin/comptable), ouvrir la facture concernée et vérifier la liste des paiements (montant, date, mode). Vérifier qu’aucun doublon évident (même montant, même jour).
2. **Audit** : consulter les **AuditLog** (page admin) pour les actions **PAYMENT_RECORDED** sur cette facture (qui, quand, détails).
3. **Calcul du solde** : le solde et la balance sont calculés via la logique métier (ex. `computeInvoiceTotals`). Vérifier que le montant de la facture et la somme des paiements sont cohérents avec les données affichées.

### Actions

- **Ne jamais supprimer un paiement directement en base** : risque d’incohérence et d’absence de traçabilité.
- **Erreur humaine (saisie)** : créer un **paiement correctif** ou un **avoir** selon la procédure métier/comptable en vigueur. Documenter la décision.
- **Bug suspecté (ex. race condition)** : rollback applicatif si un déploiement récent pourrait être en cause. Analyser le code (ex. enregistrement paiement, concurrence) et ajouter un test de non-régression avant correctif.

---

## 5) Incident : Clôture comptable bloquante

### Symptômes

- Message **« PÉRIODE COMPTABLE CLÔTURÉE : modification interdite »** (ou équivalent) lors de l’enregistrement d’un paiement ou d’une modification de facture.
- L’utilisateur ne peut plus enregistrer un paiement alors que la période devrait être ouverte.

### Diagnostic

- **Paramètre de clôture** : vérifier **CompanySettings** (paramètres entreprise) : champ **accountingLockedUntil**. Toute entité (facture, paiement) dont la date (ex. `invoice.createdAt`) est **≤** cette date est considérée en période clôturée.
- **Date de la facture** : comparer `invoice.createdAt` (ou date de l’entité concernée) à **accountingLockedUntil**. Si la date de la facture est antérieure ou égale à la clôture, le blocage est attendu.

### Actions

- **Ne jamais modifier accountingLockedUntil directement en base** : risque d’incohérence et de non-respect de la règle métier.
- **Ajustement de la clôture** : utiliser **uniquement** l’action métier prévue (paramètres admin) : mise à jour de la date de clôture via l’interface (action dédiée, réservée ADMIN). La règle métier impose que la date de clôture ne peut **pas être reculée** (irréversibilité) ; toute avance doit être documentée et validée.
- **Documenter** : noter la décision (qui, quand, raison) et mettre à jour la doc interne si besoin ; voir `docs/AUDIT_ACCOUNTING_CLOSE.md`.

---

## 6) Incident : RBAC / accès non autorisé

### Symptômes

- Utilisateur reçoit **403 « Accès refusé »** sur une page ou une API qu’il estime légitime.
- Pics de **403** dans les logs Vercel après un déploiement ou un changement de rôle.

### Diagnostic

- **Rôle utilisateur** : vérifier le rôle du compte (ADMIN, COMPTABLE, MAGASINIER, CLIENT, etc.) et le périmètre autorisé pour ce rôle (voir doc RBAC / matrice des droits).
- **Ownership** : pour les ressources « par client » (ex. facture, commande), vérifier que **order.userId** (ou l’entité équivalente) correspond bien à l’utilisateur connecté. Un client ne doit accéder qu’à ses propres ressources.
- **Tests / staging** : si le rapport provient d’un test E2E, vérifier le **storageState** (compte utilisé) et la base URL ; pas de mélange prod/staging.

### Actions

- **Erreur métier (mauvais rôle)** : corriger le rôle ou les droits dans l’app (gestion des utilisateurs) si la demande est légitime et validée.
- **Bug applicatif** : si le garde (requireAdminAuth, ownership) est en cause après un déploiement → **rollback applicatif** et analyser le correctif avant redéploiement.
- **Ne jamais désactiver un guard RBAC en prod** pour débloquer un utilisateur : corriger la donnée (rôle) ou le code, pas la sécurité.

---

## 7) Incident : AuditLog erreur / trigger DB

### Symptômes

- Erreur **« AuditLog is immutable »** (ou message équivalent du trigger) lors d’une opération.
- Échec d’un **UPDATE** ou **DELETE** sur la table AuditLog.

### Diagnostic

- **Code** : vérifier qu’**aucune** partie de l’application ne tente un `update` ou `delete` sur **AuditLog**. La table est **append-only** ; seuls les **INSERT** sont autorisés.
- **Migration** : vérifier que la migration **audit_log_immutable** (trigger en base) est bien appliquée : `npx prisma migrate status` (avec DIRECT_URL). Le trigger doit rejeter tout UPDATE et DELETE.

### Actions

- **Corriger le code** : supprimer ou modifier toute action qui tente de mettre à jour ou supprimer un enregistrement AuditLog. Rétablir un flux en lecture/écriture append-only.
- **Ne jamais désactiver ou supprimer le trigger** en prod : il garantit l’intégrité et la conformité des logs d’audit.

---

## 8) Incident DB critique (connexion / corruption)

### Symptômes

- **Prisma** : timeouts systématiques, erreurs « Connection refused » ou « Too many connections ».
- Migrations bloquées ou échec répété de `prisma migrate deploy`.
- Indication possible de corruption ou panne côté fournisseur DB.

### Diagnostic

- **Statut du fournisseur** : consulter le statut du service (Neon, Supabase, RDS, etc.) et les incidents en cours.
- **Connexions** : vérifier le nombre de connexions actives / max (dashboard du provider). En serverless, **DATABASE_URL** doit être une URL **pooled** pour limiter les connexions.
- **URL et secrets** : vérifier que **DATABASE_URL** et **DIRECT_URL** en Production (Vercel) pointent bien vers la base prod et sont valides (pas d’expiration de mot de passe, pas de typo). Ne pas noter les valeurs dans le runbook.

### Actions

- **Mode maintenance** : si la DB est indisponible ou en restauration, envisager une page de maintenance ou un message utilisateur (selon la stratégie de l’équipe). Informer les parties prenantes.
- **Restauration** : en cas de corruption ou perte de données, suivre **docs/RESTAURATION_BACKUP.md** (restauration depuis un backup). Tester la procédure sur une copie si possible avant de toucher à la prod.
- **Communication** : informer l’équipe technique et les stakeholders ; documenter la cause et les actions dans la checklist post-incident (section 10).

---

## 9) Incident : PDF indisponible (PDFShift « API Key not found »)

### Symptômes

- Message utilisateur : **« PDF indisponible (configuration). Contactez l'administrateur. »** (avec un **Code: &lt;requestId&gt;**).
- PDFShift renvoie **401/403** ou body contenant **« API Key was not found »**.

### Diagnostic (logs Vercel)

1. **Récupérer le requestId** affiché à l’utilisateur (ex. dans le toast ou le message d’erreur).
2. **Vercel** → Project → **Logs** → filtrer par ce **requestId** (ou par `[PDF_CONFIG]` / `[PDF_ERROR]`).
3. **Interpréter** :
   - **`[PDF_CONFIG]`** (à chaque génération PDF) : `vercelEnv`, `keyPresent`, `keyLength`, `keyHash` (hash court non réversible, jamais la clé en clair).
     - **Succès attendu en prod** : `keyPresent=true`, `keyLength>20`, `vercelEnv=production`, `keyHash` stable (même valeur qu’après config correcte).
     - **keyPresent=false** ou **keyLength=0** → variable **PDFSHIFT_API_KEY** absente pour cet environnement (vérifier le **scope** Production/Preview).
     - **keyHash inattendu** (différent de la clé que vous avez configurée) → mauvaise valeur en env ou **redeploy** non fait après changement.
   - **`[PDF_ERROR]`** avec **step: PDFSHIFT_AUTH** : contient `vercelEnv`, `keyHash`, `status`, `bodyPreview`. Confirme que la clé envoyée (hash) n’est pas reconnue par PDFShift.

### Actions

- **Après tout changement de PDFSHIFT_API_KEY** : **Redeploy obligatoire** (les env vars sont lues au build/déploiement). Sans redeploy, l’ancienne valeur (ou l’absence de clé) reste en mémoire.
- **Vérifier le scope** : dans Vercel → Settings → Environment Variables, **PDFSHIFT_API_KEY** doit être définie pour **Production** (et éventuellement Preview si vous testez les previews). Une clé définie uniquement pour « Development » n’est pas disponible en Production.
- **Nouvelle clé** : créer une nouvelle clé sur https://app.pdfshift.io → Dashboard → API Keys, copier la valeur **sans espace**, la coller dans Vercel (Production), **sauvegarder** puis **Redeploy**.
- Si le problème persiste avec `keyPresent=true` et `keyHash` cohérent : contacter **support@pdfshift.io** avec le **requestId** et le **keyHash** (pour qu’ils puissent vérifier côté compte).

---

## 10) Rollback standard

### Application uniquement

- **Vercel** : Dashboard → Project → **Deployments**.
- Sélectionner le **déploiement précédent** (avant l’incident) en état **Ready**.
- **Promote to Production** (ou « … » → Promote).
- Vérifier que l’URL de prod pointe sur cette version (smoke rapide : health, login, une page critique).

**Effet** : le code et le build reviennent à la version précédente. Les **données** et la **base** ne sont pas modifiées.

### Base de données

- **Ne jamais faire de rollback de migration destructive** en prod (pas de `migrate resolve` ou annulation manuelle de migration sans procédure écrite et validée).
- **Si une migration « cassante » a déjà été appliquée** et que l’on rollback l’app : l’ancienne version peut être incompatible avec le schéma actuel. Stratégie recommandée : **migration corrective forward** (nouvelle migration qui remet la DB dans un état lisible par l’ancienne app, ex. rajout d’une colonne nullable). Documenter au cas par cas ; voir `docs/GO_LIVE_PLAN_MAR_2026.md` section 3.2.

---

## 11) Checklist post-incident

À compléter pour **chaque** incident avant clôture :

- [ ] **Cause racine** : décrite clairement (bug, config, volumétrie, fournisseur, etc.).
- [ ] **Action corrective** : ce qui a été fait (rollback, correctif, changement de config, procédure métier).
- [ ] **Test de non-régression** : si bug logique, ajout ou mise à jour d’un test (unit ou E2E) pour éviter la réapparition.
- [ ] **Documentation** : mise à jour de **PERF_AUDIT**, **GO_LIVE_PLAN**, **INCIDENT_RUNBOOK** ou autres docs si la procédure a changé ou si un nouveau cas doit être couvert.
- [ ] **Équipe** : information partagée (résumé, leçons apprises, prochaines étapes).

---

**Références rapides**

| Sujet           | Document                          |
|----------------|------------------------------------|
| Rollback / go-live | `docs/GO_LIVE_PLAN_MAR_2026.md` |
| Restore backup | `docs/RESTAURATION_BACKUP.md`      |
| Exports / perf | `docs/PERF_AUDIT.md`               |
| Clôture comptable | `docs/AUDIT_ACCOUNTING_CLOSE.md` |
