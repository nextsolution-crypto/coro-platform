import { PrismaService } from '../prisma/prisma.service';
export declare class GeneratorService {
    private prisma;
    constructor(prisma: PrismaService);
    private buildContext;
    generateAndSave(projectId: string, config: any): Promise<{
        title: string;
        content: {
            modules: any[];
            config: any;
            generatedAt: Date;
        };
        status: any;
        version: number;
        projectId: string;
        documentId: any;
    }>;
    getDocument(projectId: string): Promise<({
        project: {
            client: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                isActive: boolean;
                email: string | null;
                phone: string | null;
                address: string | null;
                city: string | null;
                province: string | null;
                logoUrl: string | null;
                logoBase64: string | null;
            };
            building: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                isActive: boolean;
                clientId: string;
                address: string;
                city: string;
                province: string;
                postalCode: string | null;
                floors: number | null;
                units: number | null;
                buildingType: string | null;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.ProjectStatus;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            documentType: import("@prisma/client").$Enums.DocumentType;
            year: number;
            progress: number;
            isActive: boolean;
            clientId: string;
            buildingId: string;
            userId: string;
        };
    } & {
        id: string;
        title: string;
        content: import("@prisma/client/runtime/library").JsonValue | null;
        status: import("@prisma/client").$Enums.DocumentStatus;
        version: number;
        createdAt: Date;
        updatedAt: Date;
        projectId: string;
    }) | null>;
    updateModuleContent(documentId: string, moduleId: string, sectionId: string, content: string): Promise<{
        success: boolean;
        moduleId: string;
        sectionId: string;
    }>;
}
