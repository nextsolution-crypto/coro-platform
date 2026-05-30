import { PrismaService } from '../prisma/prisma.service';
export declare class GeneratorService {
    private prisma;
    constructor(prisma: PrismaService);
    generateDocumentStructure(projectId: string, config: any): Promise<{
        projectId: string;
        documentType: import("@prisma/client").$Enums.DocumentType;
        clientName: string;
        buildingName: string;
        generatedAt: Date;
        modules: any[];
    }>;
    getModule1Preview(projectId: string, config: any): Promise<any>;
}
