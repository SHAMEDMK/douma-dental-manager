# Confirmation de livraison – pourquoi le test peut skip

## Contexte

Le test E2E **full-workflow-delivery** couvre le flux : client crée commande → admin prépare → admin expédie → livreur confirme la livraison avec un code à 6 chiffres.  
À la fin, le test attend soit le **toast « Livraison confirmée »**, soit la **disparition de la carte** de la commande de la liste livreur. Si aucun des deux n’arrive dans les 12 secondes, le test est **ignoré** (skip) pour ne pas faire échouer toute la suite.

---

## Pourquoi on n’a ni toast ni retrait de la carte ?

Après le clic sur « Confirmer la livraison », trois choses peuvent se passer côté app :

### 1. **Code de confirmation invalide (cause la plus probable)**

- Le **code à 6 chiffres** est généré quand l’admin **expédie** la commande. Il est affiché :
  - sur la page admin (détail de la commande), dans le bloc « Code de confirmation » ;
  - côté client (portal) sur la commande / le BL.
- Le test récupère un code avec :  
  `page.locator('text=/\\d{6}/')` puis le **premier** texte qui contient 6 chiffres.
- Sur la page il peut y avoir **plusieurs** nombres à 6 chiffres (date, numéro de commande, montants, etc.). Si le test prend le **mauvais** (pas le vrai `deliveryConfirmationCode`), le livreur envoie un code faux.

**Côté serveur** (`app/actions/delivery.ts` – `confirmDeliveryWithCodeAction`) :

- Si `order.deliveryConfirmationCode !== confirmationCode` → la fonction retourne `{ error: 'Code de confirmation incorrect' }`.
- Aucune mise à jour de statut, pas de `router.refresh()`, la commande reste « Expédiée » dans la liste livreur.

**Côté UI** (`app/delivery/DeliveryConfirmationForm.tsx`) :

- En cas de `result.error` : `toast.error(result.error)` et `setError(result.error)`.
- Donc on voit un **toast d’erreur** (et un message dans le formulaire), **pas** « Livraison confirmée », et la **carte ne disparaît pas** (la commande reste en liste).

Résumé : **mauvais code → API renvoie une erreur → toast d’erreur au lieu de « Livraison confirmée », pas de refresh ni retrait de la carte.**

---

### 2. **Réponse de l’API / action serveur**

Même avec le **bon** code, l’action peut échouer pour d’autres raisons :

- **Session** : le livreur doit être connecté (rôle ADMIN ou MAGASINIER). Si la session est perdue ou différente en E2E, `getSession()` peut renvoyer rien ou un autre rôle → `{ error: 'Non autorisé' }`.
- **Statut** : la commande doit être `SHIPPED`. Si elle est encore `PREPARED` ou déjà `DELIVERED`, l’action retourne une erreur.
- **Assignation** : si la commande a un `deliveryAgentName` et que le nom/email de la session ne correspond pas, l’action peut retourner « Cette commande est assignée à un autre livreur ».
- **Base de données** : erreur en base pendant la transaction (création de facture, mise à jour de la commande) → exception, pas de `toast.success`, pas de refresh.

Dans tous ces cas, le formulaire reçoit une erreur → `toast.error` + message dans le formulaire, pas de toast « Livraison confirmée » ni disparition de la carte.

---

### 3. **Affichage du toast (react-hot-toast)**

Quand tout va bien :

- Le code appelle `toast.success('Livraison confirmée pour la commande …')` puis `router.refresh()`.
- Le toast s’affiche brièvement ; après un délai il disparaît.
- Le `router.refresh()` recharge les données : la commande passe en « Livrée » et peut être retirée de la liste des commandes à livrer.

En E2E, le test pourrait ne pas voir le toast si :

- Le **timing** est mauvais (toast déjà disparu quand le test regarde).
- Le **conteneur** du toast (ToasterProvider) n’est pas dans la même page / le même DOM que celui que Playwright interroge (par exemple contexte ou iframe).
- Un **autre** toast (erreur ou autre) s’affiche à la place parce que l’API a renvoyé une erreur (cas 1 ou 2).

C’est pour ça que le test accepte **soit** le toast « Livraison confirmée », **soit** la **disparition de la carte** (preuve que la liste a été rafraîchie et que la commande n’est plus à livrer).

---

## Que vérifier côté app ?

1. **Code utilisé par le test**  
   S’assurer que le test récupère le **vrai** code de confirmation (celui affiché dans le bloc « Code de confirmation » de la page admin pour cette commande), et pas un autre nombre à 6 chiffres (date, autre commande, etc.). Voir ci‑dessous une piste de correction du test.

2. **Session livreur en E2E**  
   Vérifier qu’après `loginAsDeliveryAgent(page)` la session est bien celle d’un utilisateur avec rôle MAGASINIER (ou ADMIN) et que la commande est bien assignée à ce livreur (ou sans assignation stricte).

3. **Logs / erreurs**  
   En lançant l’app en local et en refaisant le scénario (ou en regardant les logs du serveur pendant le run E2E), vérifier si l’API de confirmation renvoie une erreur (`Code de confirmation incorrect`, `Non autorisé`, etc.) ou une exception.

4. **Toast et refresh**  
   Vérifier que, après un succès, le toast « Livraison confirmée » s’affiche bien et que la page livreur fait bien un `router.refresh()` (liste mise à jour, carte disparue).

---

## Amélioration possible du test : récupérer le bon code

Au lieu de prendre le premier `\d{6}` de la page, le test peut cibler le bloc qui affiche explicitement le code de confirmation sur la **page de détail de la commande** (admin), après l’expédition :

- Par exemple : localiser la zone qui contient le texte « Code de confirmation » puis lire le nombre à 6 chiffres **dans cette zone** (même ligne ou bloc suivant).
- Ainsi, le code saisi par le livreur en E2E sera bien `order.deliveryConfirmationCode`, et l’API pourra renvoyer succès → toast « Livraison confirmée » et retrait de la carte.

Exemple de sélecteur possible (à adapter selon la structure exacte du HTML) :

- `page.getByText('Code de confirmation').locator('..').locator('..').getByText(/\d{6}/)`  
  ou un `data-testid` sur le bloc « Code de confirmation » pour plus de robustesse.

En résumé : **il faudra vérifier côté app** que, après « Confirmer », on a bien un code valide envoyé à l’API, une réponse succès, et un affichage correct du toast + refresh (react-hot-toast). La cause la plus probable en E2E est un **mauvais code** récupéré par le test ; corriger la récupération du code (et éventuellement la session / l’assignation) devrait faire passer le test sans skip.
