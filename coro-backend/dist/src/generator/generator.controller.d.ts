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
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                city: string | null;
                province: string | null;
                email: string | null;
                phone: string | null;
                address: string | null;
                logoUrl: string | null;
                logoBase64: string | null;
            };
            building: {
                id: string;
                name: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                clientId: string;
                city: string;
                province: string;
                floors: number | null;
                buildingType: string | null;
                address: string;
                postalCode: string | null;
                units: number | null;
            };
        } & {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.ProjectStatus;
            documentType: import("@prisma/client").$Enums.DocumentType;
            year: number;
            progress: number;
            clientId: string;
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
        title: string;
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
