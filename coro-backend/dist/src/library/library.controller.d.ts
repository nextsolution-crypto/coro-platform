import { LibraryService } from './library.service';
export declare class LibraryController {
    private libraryService;
    constructor(libraryService: LibraryService);
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
    getProcedures(): Promise<({
        incidentCode: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            color: string;
            description: string | null;
        } | null;
        role: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            roleCode: string;
            isStandard: boolean;
        } | null;
    } & {
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
    })[]>;
    createProcedure(body: any): Promise<{
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
    updateProcedure(id: string, body: any): Promise<{
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
