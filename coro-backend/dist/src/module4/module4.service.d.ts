import { PrismaService } from '../prisma/prisma.service';
export declare class Module4Service {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getModule4(projectId: string): Promise<{
        documentId: string;
        module4: any;
    }>;
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
    saveModule4(projectId: string, dto: any): Promise<{
        success: boolean;
        message: string;
        updatedAt: any;
    }>;
}
