import { PrismaService } from '../prisma/prisma.service';
export declare class GeneratorService {
    private prisma;
    constructor(prisma: PrismaService);
    private buildContext;
    generateAndSave(projectId: string, config: any): Promise<{
        title: string;
        content: {
            modules_fr: any[];
            modules_en: any[];
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
                email: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                phone: string | null;
                address: string | null;
                city: string | null;
                province: string | null;
                logoUrl: string | null;
                logoBase64: string | null;
            };
            building: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                address: string;
                city: string;
                province: string;
                postalCode: string | null;
                floors: number | null;
                units: number | null;
                buildingType: string | null;
                clientId: string;
            };
        } & {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            year: number;
            clientId: string;
            documentType: import("@prisma/client").$Enums.DocumentType;
            status: import("@prisma/client").$Enums.ProjectStatus;
            progress: number;
            buildingId: string;
            userId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.DocumentStatus;
        content: import("@prisma/client/runtime/library").JsonValue | null;
        version: number;
        projectId: string;
        title: string;
    }) | null>;
    updateModuleContent(documentId: string, moduleId: string, sectionId: string, content: string, language?: string): Promise<{
        success: boolean;
        moduleId: string;
        sectionId: string;
        language: string;
    }>;
}
