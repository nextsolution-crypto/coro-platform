import { GeneratorService } from './generator.service';
export declare class GeneratorController {
    private generatorService;
    constructor(generatorService: GeneratorService);
    generate(projectId: string, config: any): Promise<{
        projectId: string;
        documentType: import("@prisma/client").$Enums.DocumentType;
        clientName: string;
        buildingName: string;
        generatedAt: Date;
        modules: any[];
    }>;
    getModule1(projectId: string, config: any): Promise<any>;
}
