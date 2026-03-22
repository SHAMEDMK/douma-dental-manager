/**
 * Contrôle de forme basique (pas une validation RFC complète).
 * Utilisé avant envoi / enregistrement d’actions dépendant d’un e-mail.
 */
export function isValidEmailFormat(email: string): boolean {
  const t = email.trim()
  if (t.length < 5 || t.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}
