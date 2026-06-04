import { Module4Service } from './module4.service';
export declare class LibraryController {
    private readonly module4Service;
    constructor(module4Service: Module4Service);
    getLibrary(): Promise<{
        procedures: {
            id: string;
            code: string;
            titleFR: string;
            titleEN: string;
            icon: string | undefined;
            headerColor: string;
            activationRule: string;
            documentTypes: string[];
            phase: string | undefined;
            roleCount: number;
        }[];
    }>;
    getProcedureFull(procedureId: string): Promise<import("../generator/procedures").ProcedureTemplate>;
}
