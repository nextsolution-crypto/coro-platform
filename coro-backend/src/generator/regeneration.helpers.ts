// Règles appliquées à chaque génération / régénération d'un PMU ou d'un PSI.
import { RoleCoverage, sanitizeAssignments } from './role-coverage';

/** Rôles utilisés quand l'organigramme n'a encore jamais été enregistré. */
const DEFAULT_ROLE_CODES = [
  'ROLE-CU',
  'ROLE-EPI',
  'ROLE-RM',
  'ROLE-RPR',
  'ROLE-SS',
  'ROLE-BRI',
  'ROLE-RS',
  'ROLE-CHE',
  'ROLE-ACC',
];

export function hasSecurityAgent(config: any): boolean {
  return !!(config?.agentSecurite || config?.securite24h);
}

/**
 * Rôles actifs pour les procédures du module 4.
 * L'organigramme ne porte pas de case « Agent de sécurité » (l'agent y figure en
 * note du coordonnateur) : le rôle ROLE-AS suit donc la configuration, et le
 * résultat est le même à la première génération et aux suivantes.
 */
export function resolveActiveRoleCodes(
  savedOrgRoles: any[] | undefined,
  config: any,
): string[] {
  // Un rôle ajouté à la main dans l'organigramme n'a pas de code : son id en tient lieu.
  const fromChart = (savedOrgRoles || [])
    .filter((role: any) => role?.isActive)
    .map((role: any) => role.roleCode || (role.source === 'custom' ? role.id : null))
    .filter(Boolean);
  const base = fromChart.length > 0 ? fromChart : DEFAULT_ROLE_CODES;
  const codes = base.filter((code: string) => code !== 'ROLE-AS');
  if (hasSecurityAgent(config)) codes.unshift('ROLE-AS');
  return Array.from(new Set(codes));
}

/**
 * Garde le texte des sections modifiées à la main dans l'éditeur
 * (marquées `manuallyEdited`), même section et même langue.
 */
export function keepManualEdits(newModules: any[], existingModules: any[] | undefined): any[] {
  if (!existingModules?.length) return newModules;
  return newModules.map((newModule: any) => {
    if (!Array.isArray(newModule?.sections)) return newModule;
    const previous = existingModules.find(
      (module: any) => module?.moduleNumber === newModule.moduleNumber,
    );
    if (!Array.isArray(previous?.sections)) return newModule;
    return {
      ...newModule,
      sections: newModule.sections.map((section: any) => {
        const edited = previous.sections.find(
          (old: any) => old?.id === section.id && old?.manuallyEdited,
        );
        return edited
          ? {
              ...section,
              content: edited.content,
              manuallyEdited: true,
              manuallyEditedAt: edited.manuallyEditedAt,
            }
          : section;
      }),
    };
  });
}

/** Organigramme du document : version enregistrée par l'éditeur, sinon celle générée. */
export function orgRolesFromContent(content: any): any[] {
  const saved = content?.module3?.orgRoles;
  if (Array.isArray(saved) && saved.length > 0) return saved;
  return (
    content?.modules_fr
      ?.find((m: any) => m.moduleNumber === 3)
      ?.sections?.find((s: any) => s.id === '3.1')?.orgRoles || []
  );
}

/** Rôles actifs, décisions de reprise et organigramme d'un document. */
export function roleCoverageFromContent(content: any, config: any): RoleCoverage {
  const orgRoles = orgRolesFromContent(content);
  const activeCodes = resolveActiveRoleCodes(orgRoles, config);
  return {
    activeCodes,
    orgRoles,
    assignments: sanitizeAssignments(content?.module4?.roleAssignments, activeCodes),
  };
}
