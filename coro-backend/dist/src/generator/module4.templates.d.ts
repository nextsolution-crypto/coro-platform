import { DocumentContext } from './module1.templates';
import { getActiveProcedures, getAllProcedures, getProcedureById, PROCEDURES_REGISTRY } from './procedures/index';
export { getActiveProcedures, getAllProcedures, getProcedureById };
export declare function generateModule4(ctx: DocumentContext, config?: any, activeRoleCodes?: string[], customProcedureIds?: string[]): any;
export { PROCEDURES_REGISTRY };
