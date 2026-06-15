import { GeneratorService } from './generator.service';
export declare class GeneratorController {
    private generatorService;
    constructor(generatorService: GeneratorService);
    generate(projectId: string, config: any): Promise<{
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
    updateSection(documentId: string, moduleId: string, sectionId: string, body: {
        content: string;
        language?: string;
    }): Promise<{
        success: boolean;
        moduleId: string;
        sectionId: string;
        language: string;
    }>;
}
