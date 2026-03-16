/**
 * Registre des modules actifs.
 * Utilise lib/feature-flags.ts pour l'activation via variables d'environnement.
 */
import {
  getEnabledModules,
  isModulePurchasesEnabled,
  isModuleCrmEnabled,
  isModuleReportsEnabled,
} from '@/lib/feature-flags'

export type ModuleId = 'purchases' | 'crm' | 'reports'

export interface ModuleInfo {
  id: ModuleId
  label: string
  enabled: boolean
  path?: string
}

/** Modules connus et leur statut d'activation */
export function getModules(): ModuleInfo[] {
  return [
    { id: 'purchases', label: 'Achats / Fournisseurs', enabled: isModulePurchasesEnabled(), path: '/admin/purchases' },
    { id: 'crm', label: 'CRM', enabled: isModuleCrmEnabled(), path: '/admin/crm' },
    { id: 'reports', label: 'Rapports / BI', enabled: isModuleReportsEnabled(), path: '/admin/reports' },
  ]
}

/** Vérifie si un module est actif */
export function isModuleEnabled(id: ModuleId): boolean {
  return getEnabledModules().includes(id)
}
