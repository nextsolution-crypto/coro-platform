import { PrismaService } from '../prisma/prisma.service';
export declare class LibraryService {
    private prisma;
    constructor(prisma: PrismaService);
    getIncidentCodes(): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        code: string;
        color: string;
        description: string | null;
    }[]>;
    getRoles(): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        roleCode: string;
        isStandard: boolean;
    }[]>;
    getProcedures(): Promise<{
        id: string;
        code: string;
        titleFR: string;
        titleEN: string;
        icon: string | undefined;
        headerColor: string;
        activationRule: string;
        documentTypes: string[];
        phase: string | undefined;
        status: string;
        roleSections: {
            roleCode: string;
            roleLabelFR: string;
            roleLabelEN: string;
            headerColor: string;
            stepCount: number;
        }[];
        totalSteps: number;
    }[]>;
    createProcedure(data: any): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.ProcedureStatus;
        description: string | null;
        documentTypes: string[];
        phase: string | null;
        content: import("@prisma/client/runtime/library").JsonValue | null;
        version: number;
        incidentCodeId: string | null;
        roleId: string | null;
    }>;
    updateProcedure(id: string, data: any): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        status: import("@prisma/client").$Enums.ProcedureStatus;
        description: string | null;
        documentTypes: string[];
        phase: string | null;
        content: import("@prisma/client/runtime/library").JsonValue | null;
        version: number;
        incidentCodeId: string | null;
        roleId: string | null;
    }>;
}
