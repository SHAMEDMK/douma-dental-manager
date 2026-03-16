/**
 * Feature flags pour activer/désactiver des modules optionnels.
 * Utilise les variables d'environnement (ex: ENABLE_MODULE_PURCHASES=true).
 * Voir docs/ROADMAP_ERP.md et lib/modules/README.md.
 */

const truthy = (v: string | undefined): boolean =>
  v != null && ['1', 'true', 'yes'].includes(v.toLowerCase().trim())

/** Module Achats / Fournisseurs (futur) */
export function isModulePurchasesEnabled(): boolean {
  return truthy(process.env.ENABLE_MODULE_PURCHASES)
}

/** Module CRM (futur) */
export function isModuleCrmEnabled(): boolean {
  return truthy(process.env.ENABLE_MODULE_CRM)
}

/** Module Rapports / BI (futur) */
export function isModuleReportsEnabled(): boolean {
  return truthy(process.env.ENABLE_MODULE_REPORTS)
}

/** Liste des modules actifs (pour UI, menus, etc.) */
export function getEnabledModules(): string[] {
  const modules: string[] = []
  if (isModulePurchasesEnabled()) modules.push('purchases')
  if (isModuleCrmEnabled()) modules.push('crm')
  if (isModuleReportsEnabled()) modules.push('reports')
  return modules
}
