import { ProcedureTemplate } from './types';
export declare const PROCEDURES_REGISTRY: ProcedureTemplate[];
export declare const ACTIVATION_RULES: Record<string, (config: any) => boolean>;
export declare function getActiveProcedures(config: any, documentType: string, activeRoleCodes: string[]): ProcedureTemplate[];
export declare function getAllProcedures(): ProcedureTemplate[];
export declare function getProcedureById(id: string): ProcedureTemplate | undefined;
export type { ProcedureTemplate, ProcedureStep, RoleSection } from './types';
